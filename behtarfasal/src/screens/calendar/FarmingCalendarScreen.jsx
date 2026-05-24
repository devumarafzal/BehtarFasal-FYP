import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { auth } from '../../firebase/config';
import {
  getCalendarPlan,
  getCalendarPlansByFarm,
  getFarms,
  saveCalendarPlan,
  updateCalendarPlanTasks,
} from '../../firebase/firestore';
import { generateFarmingCalendar } from '../../services/calendarService';

const getTaskTypeColor = (taskType) => {
  const key = String(taskType || '').toLowerCase();

  if (key.includes('irrigation')) {
    return '#DAECFA';
  }
  if (key.includes('planting') || key.includes('sowing')) {
    return '#E4F1E6';
  }
  if (key.includes('fertilizer') || key.includes('nutrition')) {
    return '#FFF2D9';
  }
  if (key.includes('pesticide') || key.includes('pest')) {
    return '#FFE2E2';
  }
  if (key.includes('harvest')) {
    return '#FFEED6';
  }
  return '#EEE8E6';
};

const getTaskLabelColor = (taskType) => {
  const key = String(taskType || '').toLowerCase();

  if (key.includes('irrigation')) {
    return '#4C9FE3';
  }
  if (key.includes('planting') || key.includes('sowing')) {
    return '#54A96B';
  }
  if (key.includes('fertilizer') || key.includes('nutrition')) {
    return '#CE8A1C';
  }
  if (key.includes('pesticide') || key.includes('pest')) {
    return '#D45A5A';
  }
  if (key.includes('harvest')) {
    return '#D08313';
  }
  return '#8A7D77';
};

const getTaskIcon = (task) => {
  const key = `${task?.category || ''} ${task?.taskType || ''} ${task?.phase || ''}`.toLowerCase();

  if (key.includes('irrigation')) {
    return 'water';
  }
  if (key.includes('sowing') || key.includes('planting')) {
    return 'sprout';
  }
  if (key.includes('fertilizer') || key.includes('nutrition')) {
    return 'spray';
  }
  if (key.includes('pesticide') || key.includes('pest')) {
    return 'shield-bug-outline';
  }
  if (key.includes('harvest')) {
    return 'basket';
  }
  return 'shovel';
};

const parseDate = (value) => {
  const source = String(value || '').trim();
  if (!source) {
    return null;
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatDateLabel = (value) => {
  if (!value) {
    return 'Not set';
  }

  const parsed = parseDate(value);
  if (!parsed) {
    return String(value);
  }

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const normalizeTask = (item, index) => {
  const sequence = Number(item?.sequence || index + 1);
  const title = String(item?.title || item?.mainTask || item?.phase || `Task ${sequence}`).trim();
  const category = String(item?.category || item?.taskType || item?.phase || 'General').trim();
  const description = String(item?.description || item?.mainTask || '').trim();

  const detailsParts = [item?.details, item?.mainTask, item?.secondaryTask]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean);

  const details = detailsParts.join(' ');

  return {
    id: String(item?.id || `task-${sequence}-${index}`),
    sequence,
    date: String(item?.date || '').trim(),
    period: String(item?.period || '').trim(),
    phase: String(item?.phase || '').trim(),
    title,
    category,
    taskType: String(item?.taskType || '').trim(),
    description,
    details,
    bestTime: String(item?.bestTime || '').trim(),
    tip: String(item?.tip || '').trim(),
    secondaryTask: String(item?.secondaryTask || '').trim(),
    completed: Boolean(item?.completed),
  };
};

const normalizeTaskList = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => normalizeTask(item, index))
    .sort((a, b) => a.sequence - b.sequence);
};

const deriveCalendarWindow = (tasks) => {
  if (!tasks.length) {
    return {
      sowingDate: '',
      harvestDate: '',
    };
  }

  const sowingTask = tasks.find((task) =>
    /sow|sowing|seed/i.test(`${task.title} ${task.phase} ${task.category}`)
  );

  const harvestTask = tasks.find((task) =>
    /harvest|maturity|picking|post-harvest/i.test(`${task.title} ${task.phase} ${task.category}`)
  );

  const firstDateTask = tasks.find((task) => parseDate(task.date));
  const lastDateTask = [...tasks].reverse().find((task) => parseDate(task.date));

  return {
    sowingDate: sowingTask?.date || firstDateTask?.date || '',
    harvestDate: harvestTask?.date || lastDateTask?.date || '',
  };
};

const FarmingCalendarScreen = ({ route }) => {
  const routeFarmId = route?.params?.farmId || '';
  const routeSelectedCrop = route?.params?.selectedCrop || '';

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(routeFarmId);
  const [selectedCrop, setSelectedCrop] = useState(routeSelectedCrop);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [calendarItems, setCalendarItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSavedPlan, setLoadingSavedPlan] = useState(false);
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);
  const [savingProgress, setSavingProgress] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFarms = async () => {
      const userId = auth.currentUser?.uid;

      if (!userId) {
        setError('Please login to load farms.');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const farmList = await getFarms(userId);
        setFarms(farmList);

        if (!farmList.length) {
          setSelectedFarmId('');
          return;
        }

        const matchedRouteFarm = routeFarmId && farmList.some((farm) => farm.id === routeFarmId);
        if (matchedRouteFarm) {
          setSelectedFarmId(routeFarmId);
          return;
        }

        setSelectedFarmId((prev) => {
          const previousStillValid = prev && farmList.some((farm) => farm.id === prev);
          if (previousStillValid) {
            return prev;
          }
          return farmList[0].id;
        });
      } catch (err) {
        setError(err.message || 'Failed to load farms.');
      } finally {
        setLoading(false);
      }
    };

    fetchFarms();
  }, [routeFarmId]);

  useEffect(() => {
    if (routeSelectedCrop) {
      setSelectedCrop(routeSelectedCrop);
    }
  }, [routeSelectedCrop]);

  useEffect(() => {
    let isMounted = true;

    const loadSavedPlans = async () => {
      const userId = auth.currentUser?.uid;

      if (!userId || !selectedFarmId) {
        if (isMounted) {
          setSavedPlans([]);
        }
        return;
      }

      setLoadingSavedPlans(true);

      try {
        const plans = await getCalendarPlansByFarm(userId, selectedFarmId);
        if (!isMounted) {
          return;
        }
        setSavedPlans(plans);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err.message || 'Failed to load saved calendars.');
      } finally {
        if (isMounted) {
          setLoadingSavedPlans(false);
        }
      }
    };

    loadSavedPlans();

    return () => {
      isMounted = false;
    };
  }, [selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || null,
    [farms, selectedFarmId]
  );

  const selectedCropKey = useMemo(() => String(selectedCrop || '').trim(), [selectedCrop]);

  const calendarWindow = useMemo(() => deriveCalendarWindow(calendarItems), [calendarItems]);

  const completedTasks = useMemo(
    () => calendarItems.filter((task) => task.completed).length,
    [calendarItems]
  );

  const totalTasks = calendarItems.length;
  const progressPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const firstIncompleteIndex = useMemo(
    () => calendarItems.findIndex((task) => !task.completed),
    [calendarItems]
  );

  useEffect(() => {
    let isMounted = true;

    const loadSavedCalendarPlan = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId || !selectedFarmId || !selectedCropKey) {
        return;
      }

      setLoadingSavedPlan(true);

      try {
        const existingPlan = await getCalendarPlan(userId, selectedFarmId, selectedCropKey);
        if (!isMounted) {
          return;
        }

        if (existingPlan?.tasks?.length) {
          const normalized = normalizeTaskList(existingPlan.tasks);
          setCalendarItems(normalized);
          setExpandedTaskId((prev) => prev || normalized[0]?.id || '');
        } else {
          setCalendarItems([]);
          setExpandedTaskId('');
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err.message || 'Failed to load saved calendar plan.');
      } finally {
        if (isMounted) {
          setLoadingSavedPlan(false);
        }
      }
    };

    loadSavedCalendarPlan();

    return () => {
      isMounted = false;
    };
  }, [selectedFarmId, selectedCropKey]);

  const handleGenerateCalendar = async () => {
    const userId = auth.currentUser?.uid;
    const cropName = selectedCropKey;

    if (!userId) {
      setError('Please login again to generate calendar.');
      return;
    }

    if (!selectedFarm) {
      setError('Please select a farm first.');
      return;
    }

    if (!cropName) {
      setError('Please select one crop before generating calendar.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const generated = await generateFarmingCalendar({
        ...selectedFarm,
        selectedCrop: cropName,
      });

      const normalized = normalizeTaskList(generated);
      const window = deriveCalendarWindow(normalized);

      await saveCalendarPlan(userId, {
        farmId: selectedFarm.id,
        farmName: selectedFarm.farmName,
        district: selectedFarm.district,
        province: selectedFarm.province,
        selectedCrop: cropName,
        sowingDate: window.sowingDate,
        harvestDate: window.harvestDate,
        tasks: normalized,
      });

      setCalendarItems(normalized);
      setExpandedTaskId(normalized[0]?.id || '');
    } catch (err) {
      setError(err.message || 'Unable to generate complete crop calendar.');
      setCalendarItems([]);
      setExpandedTaskId('');
    } finally {
      setLoading(false);
    }
  };

  const persistProgress = async (updatedTasks) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !selectedFarm?.id || !selectedCropKey) {
      return;
    }

    setSavingProgress(true);
    try {
      await updateCalendarPlanTasks(userId, selectedFarm.id, selectedCropKey, updatedTasks);
    } catch (err) {
      setError(err.message || 'Could not save progress. Please try again.');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleToggleTaskCompletion = async (taskId) => {
    const currentIndex = calendarItems.findIndex((task) => task.id === taskId);
    if (currentIndex === -1) {
      return;
    }

    const task = calendarItems[currentIndex];
    const nextRequiredIndex = firstIncompleteIndex === -1 ? calendarItems.length : firstIncompleteIndex;

    if (!task.completed && currentIndex !== nextRequiredIndex) {
      Alert.alert('Complete in sequence', 'Please complete previous activity first.');
      return;
    }

    if (task.completed && currentIndex !== nextRequiredIndex - 1) {
      Alert.alert('Complete in sequence', 'You can only undo the latest completed activity.');
      return;
    }

    const updatedTasks = calendarItems.map((item, index) => {
      if (index !== currentIndex) {
        return item;
      }
      return {
        ...item,
        completed: !item.completed,
      };
    });

    setCalendarItems(updatedTasks);
    await persistProgress(updatedTasks);
  };

  const isCheckingAllowed = (index) => {
    const nextRequiredIndex = firstIncompleteIndex === -1 ? calendarItems.length : firstIncompleteIndex;
    return index === nextRequiredIndex;
  };

  const isUndoAllowed = (index) => {
    const nextRequiredIndex = firstIncompleteIndex === -1 ? calendarItems.length : firstIncompleteIndex;
    return index === nextRequiredIndex - 1;
  };

  const handleSelectSavedPlan = (plan) => {
    const cropName = String(plan?.selectedCrop || '').trim();
    if (!cropName) {
      return;
    }

    setSelectedCrop(cropName);

    if (Array.isArray(plan?.tasks) && plan.tasks.length) {
      const normalized = normalizeTaskList(plan.tasks);
      setCalendarItems(normalized);
      setExpandedTaskId(normalized[0]?.id || '');
    } else {
      setCalendarItems([]);
      setExpandedTaskId('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* <View style={styles.segmentContainer}>
          <Text style={styles.segmentActiveText}>Farming Plan</Text>
        </View> */}

        <Text style={styles.labelText}>Select Farm</Text>
        <Pressable style={styles.dropdownButton} onPress={() => setDropdownOpen((prev) => !prev)}>
          <View style={styles.dropdownButtonContent}>
            <Text style={selectedFarm ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {selectedFarm?.farmName || 'Choose a farm'}
            </Text>
            <MaterialCommunityIcons
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={theme.colors.textSecondary}
            />
          </View>
        </Pressable>

        {dropdownOpen ? (
          <View style={styles.dropdownMenu}>
            {farms.map((farm) => (
              <Pressable
                key={farm.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedFarmId(farm.id);
                  setDropdownOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{farm.farmName || 'Unnamed Farm'}</Text>
                <Text style={styles.dropdownMeta}>
                  {farm.district || 'Unknown District'}, {farm.province || 'Unknown Province'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selectedFarmId ? (
          <View style={styles.savedPlansSection}>
            <View style={styles.savedPlansHeader}>
              <Text style={styles.savedPlansTitle}>Saved Calendars</Text>
              {loadingSavedPlans ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : null}
            </View>

            {savedPlans.length ? (
              savedPlans.map((plan) => (
                <Pressable
                  key={plan.id}
                  style={styles.savedPlanCard}
                  onPress={() => handleSelectSavedPlan(plan)}
                >
                  <View style={styles.savedPlanRow}>
                    <View style={styles.savedPlanInfo}>
                      <Text style={styles.savedPlanCrop}>
                        {plan.selectedCrop || 'Saved Crop'}
                      </Text>
                      <Text style={styles.savedPlanMeta}>
                        {plan.progressPercent ?? 0}% complete
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </View>

                  <View style={styles.savedPlanDatesRow}>
                    <View style={styles.savedPlanDateBox}>
                      <Text style={styles.savedPlanDateLabel}>Sowing</Text>
                      <Text style={styles.savedPlanDateValue}>
                        {formatDateLabel(plan.sowingDate)}
                      </Text>
                    </View>
                    <View style={styles.savedPlanDateBox}>
                      <Text style={styles.savedPlanDateLabel}>Harvest</Text>
                      <Text style={styles.savedPlanDateValue}>
                        {formatDateLabel(plan.harvestDate)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : !loadingSavedPlans ? (
              <Text style={styles.savedPlansEmpty}>No saved calendars for this farm yet.</Text>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.labelText}>Selected Crop (from top recommendations)</Text>
        <TextInput
          style={styles.cropInput}
          placeholder="e.g., mungbean"
          placeholderTextColor={theme.colors.textSecondary}
          value={selectedCrop}
          onChangeText={(value) => {
            setSelectedCrop(value);
            if (error) {
              setError('');
            }
          }}
        />

        <Pressable style={styles.primaryButton} onPress={handleGenerateCalendar} disabled={loading}>
          <Text style={styles.primaryButtonText}>Generate Complete Crop Calendar</Text>
        </Pressable>

        {loading || loadingSavedPlan ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {loading ? 'Generating calendar...' : 'Loading saved calendar...'}
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {calendarItems.length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCropName}>{selectedCropKey || 'Selected Crop'}</Text>

            <View style={styles.summaryDatesRow}>
              <View style={styles.summaryDateBox}>
                <MaterialCommunityIcons name="leaf" size={20} color={theme.colors.primary} />
                <Text style={styles.summaryDateLabel}>SOWING DATE</Text>
                <Text style={styles.summaryDateValue}>{formatDateLabel(calendarWindow.sowingDate)}</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryDateBox}>
                <MaterialCommunityIcons name="basket" size={20} color={theme.colors.warning} />
                <Text style={styles.summaryDateLabel}>HARVEST DATE</Text>
                <Text style={styles.summaryDateValue}>{formatDateLabel(calendarWindow.harvestDate)}</Text>
              </View>
            </View>

            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressTitle}>Progress</Text>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>

            <Text style={styles.progressFootnote}>
              {completedTasks} of {totalTasks} tasks completed
            </Text>
          </View>
        ) : null}

        {calendarItems.length > 0 ? (
          <Text style={styles.activitiesTitle}>Activities ({calendarItems.length})</Text>
        ) : null}

        {calendarItems.map((task, index) => {
          const expanded = expandedTaskId === task.id;
          const canCheck = isCheckingAllowed(index);
          const canUndo = isUndoAllowed(index);
          const checkboxColor = task.completed
            ? theme.colors.success
            : canCheck || canUndo
              ? theme.colors.text
              : theme.colors.textSecondary;

          return (
            <View key={task.id} style={styles.activityCard}>
              <View style={styles.activityRow}>
                <Pressable
                  style={styles.activityMain}
                  onPress={() => setExpandedTaskId((prev) => (prev === task.id ? '' : task.id))}
                >
                  <View
                    style={[
                      styles.activityIconCircle,
                      { backgroundColor: getTaskTypeColor(task.taskType || task.category) },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getTaskIcon(task)}
                      size={26}
                      color={getTaskLabelColor(task.taskType || task.category)}
                    />
                  </View>

                  <View style={styles.activityContent}>
                    <View style={styles.activityHeaderRow}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <View
                        style={[
                          styles.activityTag,
                          { backgroundColor: getTaskTypeColor(task.taskType || task.category) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.activityTagText,
                            { color: getTaskLabelColor(task.taskType || task.category) },
                          ]}
                          numberOfLines={1}
                        >
                          {task.category}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.activityDescription} numberOfLines={expanded ? 0 : 2}>
                      {expanded ? task.details || task.description : task.description}
                    </Text>

                    <View style={styles.activityDateRow}>
                      <MaterialCommunityIcons
                        name="calendar-month-outline"
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.activityDateText}>{formatDateLabel(task.date || task.period)}</Text>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.checkboxButton}
                  onPress={() => handleToggleTaskCompletion(task.id)}
                >
                  <MaterialCommunityIcons
                    name={task.completed ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
                    size={32}
                    color={checkboxColor}
                  />
                </Pressable>
              </View>

              {expanded ? (
                <View style={styles.expandedSection}>
                  {task.phase ? <Text style={styles.expandedItem}>Phase: {task.phase}</Text> : null}
                  {task.period ? <Text style={styles.expandedItem}>Timeline: {task.period}</Text> : null}
                  {task.bestTime ? <Text style={styles.expandedItem}>Best time: {task.bestTime}</Text> : null}
                  {task.secondaryTask ? (
                    <Text style={styles.expandedItem}>Secondary task: {task.secondaryTask}</Text>
                  ) : null}
                  {task.tip ? <Text style={styles.expandedTip}>Tip: {task.tip}</Text> : null}
                </View>
              ) : null}
            </View>
          );
        })}

        {savingProgress ? <Text style={styles.savingText}>Saving progress...</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  segmentContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  segmentActiveText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
  },
  labelText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  dropdownButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    flex: 1,
    paddingRight: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  dropdownPlaceholder: {
    flex: 1,
    paddingRight: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  dropdownMenu: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  dropdownMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  savedPlansSection: {
    marginBottom: theme.spacing.md,
  },
  savedPlansHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  savedPlansTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  savedPlansEmpty: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  savedPlanCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  savedPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedPlanInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  savedPlanCrop: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  savedPlanMeta: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  savedPlanDatesRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  savedPlanDateBox: {
    flex: 1,
  },
  savedPlanDateLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  savedPlanDateValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  cropInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    textTransform: 'lowercase',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  loadingState: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  summaryCropName: {
    color: theme.colors.text,
    fontSize: 44,
    fontWeight: '800',
    textTransform: 'capitalize',
    marginBottom: theme.spacing.md,
  },
  summaryDatesRow: {
    backgroundColor: '#F5F5F5',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryDateBox: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#DDD',
    marginHorizontal: theme.spacing.md,
  },
  summaryDateLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  summaryDateValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  progressHeaderRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
  },
  progressPercent: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
  },
  progressTrack: {
    marginTop: theme.spacing.sm,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressFootnote: {
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  activitiesTitle: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  activityCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  activityMain: {
    flex: 1,
    flexDirection: 'row',
    padding: theme.spacing.md,
  },
  activityIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  activityTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  activityTag: {
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    maxWidth: 120,
  },
  activityTagText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  activityDescription: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  activityDateRow: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityDateText: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  checkboxButton: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    backgroundColor: '#FAFAFA',
  },
  expandedItem: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  expandedTip: {
    color: theme.colors.primaryDark,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  savingText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
});

export default FarmingCalendarScreen;

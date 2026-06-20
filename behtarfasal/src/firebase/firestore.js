import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from './config';

const getUserRef = (userId) => doc(db, 'users', userId);
const getFarmsCollectionRef = (userId) => collection(db, 'users', userId, 'farms');
const getFarmRef = (userId, farmId) => doc(db, 'users', userId, 'farms', farmId);
const getCalendarPlansCollectionRef = (userId) => collection(db, 'users', userId, 'calendarPlans');
const getChatSessionsCollectionRef = (userId) => collection(db, 'users', userId, 'chatSessions');
const getChatSessionRef = (userId, sessionId) =>
  doc(db, 'users', userId, 'chatSessions', sessionId);

const normalizeCropKey = (selectedCrop) =>
  String(selectedCrop || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getCalendarPlanDocId = (farmId, selectedCrop) => {
  const cropKey = normalizeCropKey(selectedCrop);
  if (!farmId || !cropKey) {
    throw new Error('farmId and selectedCrop are required to identify calendar plan.');
  }
  return `${farmId}__${cropKey}`;
};

const getCalendarPlanRef = (userId, farmId, selectedCrop) =>
  doc(db, 'users', userId, 'calendarPlans', getCalendarPlanDocId(farmId, selectedCrop));

const summarizeCalendarProgress = (tasks) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const totalTasks = safeTasks.length;
  const completedTasks = safeTasks.filter((task) => task?.completed).length;
  const progressPercent = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  return {
    totalTasks,
    completedTasks,
    progressPercent,
  };
};

const getFirestoreErrorMessage = (error, fallbackMessage) => {
  const errorCode = error?.code || '';

  if (errorCode.includes('permission-denied')) {
    return 'Missing or insufficient permissions. Update Firestore rules to allow authenticated users access to their saved app data.';
  }

  if (errorCode.includes('unauthenticated')) {
    return 'Your session is not authenticated. Please login and try again.';
  }

  if (errorCode.includes('not-found')) {
    return 'Firestore database is not enabled for this Firebase project.';
  }

  return error?.message || fallbackMessage;
};

const requireUserId = (userId) => {
  if (!userId) {
    throw new Error('User session missing. Please login again.');
  }
};

const sanitizeChatMessages = (messages) => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((item) => ({
      role: item?.role === 'user' ? 'user' : 'ai',
      content: String(item?.content || '').trim(),
    }))
    .filter((item) => item.content);
};

export const createUserProfile = async (userId, userData) => {
  try {
    requireUserId(userId);
    await setDoc(
      getUserRef(userId),
      {
        name: userData.name?.trim() || '',
        email: userData.email?.trim() || '',
        phone: userData.phone?.trim() || '',
        language: userData.language || 'english',
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to create user profile'));
  }
};

export const getUserProfile = async (userId) => {
  try {
    requireUserId(userId);
    const snapshot = await getDoc(getUserRef(userId));
    if (!snapshot.exists()) {
      return null;
    }
    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to fetch user profile'));
  }
};

export const updateUserProfile = async (userId, profileData) => {
  try {
    requireUserId(userId);

    const payload = {
      updatedAt: serverTimestamp(),
    };

    if (Object.prototype.hasOwnProperty.call(profileData, 'name')) {
      payload.name = profileData.name?.trim() || '';
    }

    if (Object.prototype.hasOwnProperty.call(profileData, 'email')) {
      payload.email = profileData.email?.trim() || '';
    }

    if (Object.prototype.hasOwnProperty.call(profileData, 'phone')) {
      payload.phone = profileData.phone?.trim() || '';
    }

    if (Object.prototype.hasOwnProperty.call(profileData, 'language')) {
      payload.language = profileData.language || 'english';
    }

    await setDoc(getUserRef(userId), payload, { merge: true });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to update user profile'));
  }
};

export const addFarm = async (userId, farmData) => {
  try {
    requireUserId(userId);
    const payload = {
      farmName: farmData.farmName?.trim() || '',
      farmerName: farmData.farmerName?.trim() || '',
      sizeAcres: Number(farmData.sizeAcres || 0),
      province: farmData.province || '',
      district: farmData.district?.trim() || '',
      village: farmData.village?.trim() || '',
      soilType: farmData.soilType || 'Loamy',
      phLevel: Number(farmData.phLevel || 6.5),
      nitrogen: Number(farmData.nitrogen || 0),
      phosphorus: Number(farmData.phosphorus || 0),
      potassium: Number(farmData.potassium || 0),
      rainfall: Number(farmData.rainfall || 0),
      humidity: Number(farmData.humidity || 0),
      temperature: Number(farmData.temperature || 0),
      croppingSystem: farmData.croppingSystem || '',
      soilSustainability: farmData.soilSustainability || '',
      irrigationFacilities: Array.isArray(farmData.irrigationFacilities)
        ? farmData.irrigationFacilities
        : [],
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(getFarmsCollectionRef(userId), payload);
    return docRef.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to add farm'));
  }
};

export const getFarms = async (userId) => {
  try {
    requireUserId(userId);
    const farmsQuery = query(getFarmsCollectionRef(userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(farmsQuery);
    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to fetch farms'));
  }
};

export const getRecentFarms = async (userId, maxItems = 3) => {
  try {
    requireUserId(userId);
    const farmsQuery = query(
      getFarmsCollectionRef(userId),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    const snapshot = await getDocs(farmsQuery);
    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to fetch recent farms'));
  }
};

export const getFarm = async (userId, farmId) => {
  try {
    requireUserId(userId);
    const snapshot = await getDoc(getFarmRef(userId, farmId));
    if (!snapshot.exists()) {
      return null;
    }
    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to fetch farm details'));
  }
};

export const updateFarm = async (userId, farmId, data) => {
  try {
    requireUserId(userId);
    const payload = {
      ...data,
      sizeAcres: Number(data.sizeAcres || 0),
      phLevel: Number(data.phLevel || 6.5),
      nitrogen: Number(data.nitrogen || 0),
      phosphorus: Number(data.phosphorus || 0),
      potassium: Number(data.potassium || 0),
      rainfall: Number(data.rainfall || 0),
      humidity: Number(data.humidity || 0),
      temperature: Number(data.temperature || 0),
    };

    await updateDoc(getFarmRef(userId, farmId), payload);
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to update farm'));
  }
};

export const deleteFarm = async (userId, farmId) => {
  try {
    requireUserId(userId);
    const safeFarmId = String(farmId || '').trim();
    if (!safeFarmId) {
      throw new Error('farmId is required to delete a farm.');
    }

    const plansQuery = query(
      getCalendarPlansCollectionRef(userId),
      where('farmId', '==', safeFarmId)
    );
    const snapshot = await getDocs(plansQuery);

    if (!snapshot.empty) {
      await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
    }

    await deleteDoc(getFarmRef(userId, safeFarmId));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to delete farm'));
  }
};

export const saveCalendarPlan = async (userId, planData) => {
  try {
    requireUserId(userId);

    const farmId = String(planData?.farmId || '').trim();
    const selectedCrop = String(planData?.selectedCrop || '').trim();
    if (!farmId || !selectedCrop) {
      throw new Error('farmId and selectedCrop are required to save calendar plan.');
    }

    const tasks = Array.isArray(planData?.tasks) ? planData.tasks : [];
    const progress = summarizeCalendarProgress(tasks);

    const payload = {
      farmId,
      selectedCrop,
      selectedCropKey: normalizeCropKey(selectedCrop),
      generatedFarm: {
        id: farmId,
        name: String(planData?.farmName || '').trim(),
        district: String(planData?.district || '').trim(),
        province: String(planData?.province || '').trim(),
      },
      sowingDate: String(planData?.sowingDate || '').trim(),
      harvestDate: String(planData?.harvestDate || '').trim(),
      tasks,
      totalTasks: progress.totalTasks,
      completedTasks: progress.completedTasks,
      progressPercent: progress.progressPercent,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    await setDoc(getCalendarPlanRef(userId, farmId, selectedCrop), payload, { merge: true });
    return getCalendarPlanDocId(farmId, selectedCrop);
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to save calendar plan'));
  }
};

export const getCalendarPlan = async (userId, farmId, selectedCrop) => {
  try {
    requireUserId(userId);

    const snapshot = await getDoc(getCalendarPlanRef(userId, farmId, selectedCrop));
    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to fetch calendar plan'));
  }
};

export const getCalendarPlansByFarm = async (userId, farmId) => {
  try {
    requireUserId(userId);

    const safeFarmId = String(farmId || '').trim();
    if (!safeFarmId) {
      throw new Error('farmId is required to load saved calendars.');
    }

    const plansQuery = query(
      getCalendarPlansCollectionRef(userId),
      where('farmId', '==', safeFarmId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(plansQuery);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to fetch saved calendars'));
  }
};

export const getAllCalendarPlans = async (userId) => {
  try {
    requireUserId(userId);

    const plansQuery = query(
      getCalendarPlansCollectionRef(userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(plansQuery);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to fetch all saved calendars'));
  }
};

export const updateCalendarPlanTasks = async (userId, farmId, selectedCrop, tasks) => {
  try {
    requireUserId(userId);

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const progress = summarizeCalendarProgress(safeTasks);

    await updateDoc(getCalendarPlanRef(userId, farmId, selectedCrop), {
      tasks: safeTasks,
      totalTasks: progress.totalTasks,
      completedTasks: progress.completedTasks,
      progressPercent: progress.progressPercent,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to update calendar progress'));
  }
};

export const getChatSessions = async (userId, maxItems = 20) => {
  try {
    requireUserId(userId);

    const sessionsQuery = query(
      getChatSessionsCollectionRef(userId),
      orderBy('updatedAt', 'desc'),
      limit(maxItems)
    );
    const snapshot = await getDocs(sessionsQuery);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to fetch chat sessions'));
  }
};

export const getChatSession = async (userId, sessionId) => {
  try {
    requireUserId(userId);

    const safeSessionId = String(sessionId || '').trim();
    if (!safeSessionId) {
      throw new Error('sessionId is required to load a chat session.');
    }

    const snapshot = await getDoc(getChatSessionRef(userId, safeSessionId));
    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to fetch chat session'));
  }
};

export const saveChatSession = async (userId, sessionData, sessionId = null) => {
  try {
    requireUserId(userId);

    const messages = sanitizeChatMessages(sessionData?.messages);
    const title = String(sessionData?.title || '').trim() || 'New chat';
    const lastMessage =
      [...messages].reverse().find((item) => item.role === 'user') ||
      messages[messages.length - 1];

    const payload = {
      title,
      preview: String(lastMessage?.content || '').slice(0, 160),
      messages,
      messageCount: messages.length,
      updatedAt: serverTimestamp(),
    };

    const safeSessionId = String(sessionId || '').trim();
    if (safeSessionId) {
      await setDoc(getChatSessionRef(userId, safeSessionId), payload, { merge: true });
      return safeSessionId;
    }

    const docRef = await addDoc(getChatSessionsCollectionRef(userId), {
      ...payload,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to save chat session'));
  }
};

export const deleteChatSession = async (userId, sessionId) => {
  try {
    requireUserId(userId);

    const safeSessionId = String(sessionId || '').trim();
    if (!safeSessionId) {
      throw new Error('sessionId is required to delete a chat session.');
    }

    await deleteDoc(getChatSessionRef(userId, safeSessionId));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage(error, 'Failed to delete chat session'));
  }
};

import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { auth } from './config';

export const registerWithEmail = async (email, password, name = '') => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }

    return credential.user;
  } catch (error) {
    throw new Error(error.message || 'Failed to register user');
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return credential.user;
  } catch (error) {
    throw new Error(error.message || 'Failed to login user');
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(error.message || 'Failed to logout user');
  }
};

export const subscribeToAuthChanges = (callback) => onAuthStateChanged(auth, callback);

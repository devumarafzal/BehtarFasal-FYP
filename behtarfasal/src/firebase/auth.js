import {
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    updatePassword,
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

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user?.email) {
      throw new Error('Please login again to change your password.');
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  } catch (error) {
    const code = error?.code || '';

    if (code.includes('wrong-password') || code.includes('invalid-credential')) {
      throw new Error('Current password is incorrect.');
    }

    if (code.includes('weak-password')) {
      throw new Error('New password is too weak.');
    }

    if (code.includes('too-many-requests')) {
      throw new Error('Too many attempts. Please try again later.');
    }

    throw new Error(error.message || 'Failed to change password');
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

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  onSnapshot,
  arrayUnion 
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export const firestoreService = {
  // Create or update document
  setDocument: async (collectionName, docId, data) => {
    try {
      await setDoc(doc(db, collectionName, docId), data, { merge: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get document by ID
  getDocument: async (collectionName, docId) => {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Document not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update document
  updateDocument: async (collectionName, docId, data) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete document
  deleteDocument: async (collectionName, docId) => {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Add document to collection
  addDocument: async (collectionName, data) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), data);
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Query documents
  queryDocuments: async (collectionName, field, operator, value) => {
    try {
      const q = query(collection(db, collectionName), where(field, operator, value));
      const querySnapshot = await getDocs(q);
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: documents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Listen to document changes
  listenToDocument: (collectionName, docId, callback) => {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback({ success: true, data: { id: doc.id, ...doc.data() } });
      } else {
        callback({ success: false, error: 'Document not found' });
      }
    });
  },

  // Listen to collection changes
  listenToCollection: (collectionName, callback, queryConstraints = []) => {
    try {
      const collectionRef = collection(db, collectionName);
      const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef;
      
      return onSnapshot(q, (querySnapshot) => {
        const documents = [];
        querySnapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() });
        });
        callback({ success: true, data: documents });
      }, (error) => {
        callback({ success: false, error: error.message });
      });
    } catch (error) {
      callback({ success: false, error: error.message });
      return () => {}; // Return empty unsubscribe function
    }
  },

  // Listen to query changes with real-time updates
  listenToQuery: (collectionName, queryConstraints, callback) => {
    try {
      const q = query(collection(db, collectionName), ...queryConstraints);
      
      return onSnapshot(q, (querySnapshot) => {
        const documents = [];
        const changes = [];
        
        querySnapshot.docChanges().forEach((change) => {
          const docData = { id: change.doc.id, ...change.doc.data() };
          
          changes.push({
            type: change.type, // 'added', 'modified', 'removed'
            doc: docData,
            oldIndex: change.oldIndex,
            newIndex: change.newIndex
          });
        });
        
        querySnapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() });
        });
        
        callback({ 
          success: true, 
          data: documents, 
          changes,
          metadata: querySnapshot.metadata 
        });
      }, (error) => {
        callback({ success: false, error: error.message });
      });
    } catch (error) {
      callback({ success: false, error: error.message });
      return () => {}; // Return empty unsubscribe function
    }
  },

  // Batch operations for efficient updates
  batchWrite: async (operations) => {
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      operations.forEach(operation => {
        const { type, collectionName, docId, data } = operation;
        const docRef = doc(db, collectionName, docId);
        
        switch (type) {
          case 'set':
            batch.set(docRef, data, { merge: true });
            break;
          case 'update':
            batch.update(docRef, data);
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });
      
      await batch.commit();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Transaction for atomic operations
  runTransaction: async (transactionFunction) => {
    try {
      const { runTransaction } = await import('firebase/firestore');
      
      const result = await runTransaction(db, transactionFunction);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Array union helper
  arrayUnion: arrayUnion
};
import React, { createContext, useState, useContext, useEffect } from 'react';

const SafetyContext = createContext({});

export const useSafety = () => {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
};

export const SafetyProvider = ({ children }) => {
  const [safetyScore, setSafetyScore] = useState(85);
  const [panicMode, setPanicMode] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  useEffect(() => {
    // Initialize with mock data
    const initializeSafety = () => {
      try {
        const mockEmergencyContacts = [
          {
            id: 'contact-1',
            name: 'Emergency Contact 1',
            phoneNumber: '+919876543211',
            relationship: 'Family',
            isPrimary: true
          },
          {
            id: 'contact-2',
            name: 'Emergency Contact 2',
            phoneNumber: '+919876543212',
            relationship: 'Friend',
            isPrimary: false
          }
        ];
        
        setEmergencyContacts(mockEmergencyContacts);
      } catch (error) {
        console.error('Safety initialization error:', error);
      }
    };

    initializeSafety();
  }, []);

  const activatePanicMode = async (location, profile, contacts) => {
    try {
      console.log('Activating panic mode...');
      
      setPanicMode(true);
      setIsEmergencyActive(true);
      
      // Mock emergency alert sending
      const alertData = {
        userId: profile?.userId,
        location: location,
        timestamp: new Date(),
        contacts: contacts || emergencyContacts,
        message: 'Emergency alert activated'
      };
      
      console.log('Emergency alert sent:', alertData);
      
      return { success: true, alertId: 'alert-' + Date.now() };
    } catch (error) {
      console.error('Error activating panic mode:', error);
      return { success: false, error: error.message };
    }
  };

  const deactivatePanicMode = async () => {
    try {
      console.log('Deactivating panic mode...');
      
      setPanicMode(false);
      setIsEmergencyActive(false);
      
      return { success: true };
    } catch (error) {
      console.error('Error deactivating panic mode:', error);
      return { success: false, error: error.message };
    }
  };

  const updateSafetyScore = (safetyStatus) => {
    try {
      if (safetyStatus && typeof safetyStatus.safetyScore === 'number') {
        setSafetyScore(safetyStatus.safetyScore);
      }
    } catch (error) {
      console.error('Error updating safety score:', error);
    }
  };

  const sendSafetyZoneAlert = async (safetyStatus) => {
    try {
      // Mock safety zone alert
      console.log('Safety zone alert:', safetyStatus);
      return { success: true };
    } catch (error) {
      console.error('Error sending safety zone alert:', error);
      return { success: false, error: error.message };
    }
  };

  const addEmergencyContact = (contact) => {
    try {
      const newContact = {
        ...contact,
        id: 'contact-' + Date.now()
      };
      setEmergencyContacts(prev => [...prev, newContact]);
      return { success: true, contact: newContact };
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      return { success: false, error: error.message };
    }
  };

  const removeEmergencyContact = (contactId) => {
    try {
      setEmergencyContacts(prev => prev.filter(contact => contact.id !== contactId));
      return { success: true };
    } catch (error) {
      console.error('Error removing emergency contact:', error);
      return { success: false, error: error.message };
    }
  };

  const updateEmergencyContact = (contactId, updates) => {
    try {
      setEmergencyContacts(prev => 
        prev.map(contact => 
          contact.id === contactId 
            ? { ...contact, ...updates }
            : contact
        )
      );
      return { success: true };
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    safetyScore,
    panicMode,
    isEmergencyActive,
    emergencyContacts,
    activatePanicMode,
    deactivatePanicMode,
    updateSafetyScore,
    sendSafetyZoneAlert,
    addEmergencyContact,
    removeEmergencyContact,
    updateEmergencyContact
  };

  return (
    <SafetyContext.Provider value={value}>
      {children}
    </SafetyContext.Provider>
  );
};

export { SafetyContext };
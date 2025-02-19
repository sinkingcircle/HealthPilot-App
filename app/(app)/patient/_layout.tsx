import { Stack } from 'expo-router';
import { Button } from 'react-native-paper';
import { supabase } from '../../../lib/supabase';
import { router } from 'expo-router';

export default function PatientLayout() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Home',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerRight: () => (
            <Button 
              textColor="white"
              onPress={handleLogout}
            >
              Logout
            </Button>
          ),
        }} 
      />
      <Stack.Screen 
        name="symptom-check" 
        options={{ 
          title: 'Symptom Check',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }} 
      />
      <Stack.Screen 
        name="quick-relief" 
        options={{ 
          title: 'Quick Relief',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }} 
      />
      <Stack.Screen 
        name="clinical-history" 
        options={{ 
          title: 'Clinical History',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }} 
      />
      <Stack.Screen 
        name="medication" 
        options={{ 
          title: 'Medication',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }} 
      />
      <Stack.Screen 
        name="chat/[id]" 
        options={{ 
          title: 'Chat',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }} 
      />
    </Stack>
  );
}
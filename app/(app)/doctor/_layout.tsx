import { Stack } from 'expo-router';
import { Button } from 'react-native-paper';
import { supabase } from '../../../lib/supabase';
import { router } from 'expo-router';

export default function DoctorLayout() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Doctor Dashboard',
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
        name="appointments" 
        options={{ 
          title: 'Appointments',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }} 
      />
      <Stack.Screen 
        name="patients" 
        options={{ 
          title: 'My Patients',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }} 
      />
      <Stack.Screen 
        name="prescriptions" 
        options={{ 
          title: 'Prescriptions',
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
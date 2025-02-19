import { Stack } from 'expo-router';
import { Button } from 'react-native-paper';
import { supabase } from '../../../lib/supabase';
import { router } from 'expo-router';

export default function LabLayout() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Lab Dashboard',
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
        name="upload" 
        options={{ 
          title: 'Upload Documents',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }} 
      />
      <Stack.Screen 
        name="analysis" 
        options={{ 
          title: 'Image Analysis',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }} 
      />
    </Stack>
  );
}
import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          throw new Error('Invalid email or password. Please try again.');
        }
        throw signInError;
      }

      if (!authData.user) throw new Error('No user data returned');

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          throw new Error('Profile not found. Please register first.');
        }
        throw new Error('Unable to access your profile. Please try again.');
      }

      if (!profileData) {
        throw new Error('Profile not found. Please register first.');
      }

      // Navigate based on user type
      if (profileData.user_type === 'patient') {
        router.replace('/(app)/patient/');
      } else if (profileData.user_type === 'doctor') {
        router.replace('/(app)/doctor/');
      } else {
        router.replace('/(app)/lab/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500' }}
            style={styles.logo}
          />
          <Text variant="headlineLarge" style={styles.title}>HealthPilot</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>Your Health, Our Priority</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            error={!!error && error.toLowerCase().includes('email')}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            error={!!error && error.toLowerCase().includes('password')}
          />

          {error && (
            <HelperText type="error" visible={true}>
              {error}
            </HelperText>
          )}

          <Button 
            mode="contained" 
            onPress={handleLogin}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            Login
          </Button>

          <View style={styles.registerLink}>
            <Text variant="bodyMedium">Don't have an account? </Text>
            <Link href="/register" asChild>
              <Button mode="text" compact>Register</Button>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  title: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    marginTop: 5,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    padding: 4,
  },
  registerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
});
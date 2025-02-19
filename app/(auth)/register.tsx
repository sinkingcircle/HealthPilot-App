import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, HelperText } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

type UserType = 'patient' | 'doctor' | 'lab';

export default function Register() {
  const [userType, setUserType] = useState<UserType>('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateInputs = () => {
    if (!name.trim()) return "Name is required";
    if (!email.trim()) return "Email is required";
    if (!email.includes('@')) return "Invalid email format";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirmPassword) return "Passwords don't match";
    if (userType === 'doctor' && !specialty.trim()) return "Specialty is required for doctors";
    if (userType !== 'patient' && !licenseNumber.trim()) return "License number is required";
    return null;
  };

  const createProfile = async (userId: string) => {
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          user_type: userType,
          full_name: name.trim(),
          email: email.trim(),
          specialty: userType === 'doctor' ? specialty.trim() : null,
          license_number: userType !== 'patient' ? licenseNumber.trim() : null,
        });

      if (profileError) throw profileError;
      return true;
    } catch (err) {
      console.error('Profile creation error:', err);
      return false;
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError(null);

      const validationError = validateInputs();
      if (validationError) {
        setError(validationError);
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            user_type: userType,
            specialty: userType === 'doctor' ? specialty.trim() : null,
            license_number: userType !== 'patient' ? licenseNumber.trim() : null,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user data returned');

      // Create profile with retries
      let profileCreated = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!profileCreated && retryCount < maxRetries) {
        profileCreated = await createProfile(authData.user.id);
        if (!profileCreated) {
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }

      if (!profileCreated) {
        throw new Error('Could not create user profile. Please try again.');
      }

      alert('Registration successful! Please login with your email and password.');
      router.replace('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
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
          <Text variant="bodyLarge" style={styles.subtitle}>Create Your Account</Text>
        </View>

        <View style={styles.form}>
          <SegmentedButtons
            value={userType}
            onValueChange={value => setUserType(value as UserType)}
            buttons={[
              { value: 'patient', label: 'Patient' },
              { value: 'doctor', label: 'Doctor' },
              { value: 'lab', label: 'Lab' },
            ]}
            style={styles.segment}
          />

          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            error={error?.includes('Name')}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            error={error?.includes('email')}
          />

          {userType === 'doctor' && (
            <TextInput
              label="Specialty"
              value={specialty}
              onChangeText={setSpecialty}
              mode="outlined"
              style={styles.input}
              error={error?.includes('Specialty')}
            />
          )}

          {userType !== 'patient' && (
            <TextInput
              label={userType === 'doctor' ? 'Medical License Number' : 'Lab License Number'}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              mode="outlined"
              style={styles.input}
              error={error?.includes('License')}
            />
          )}

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            error={error?.includes('Password')}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            error={error?.includes('match')}
          />

          {error && (
            <HelperText type="error" visible={true}>
              {error}
            </HelperText>
          )}

          <Button 
            mode="contained" 
            onPress={handleRegister}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            Register
          </Button>

          <View style={styles.loginLink}>
            <Text variant="bodyMedium">Already have an account? </Text>
            <Link href="/login" asChild>
              <Button mode="text" compact>Login</Button>
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
  segment: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    padding: 4,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
});
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, useTheme, ActivityIndicator, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';

interface Doctor {
  id: string;
  full_name: string;
  email: string;
  specialty: string;
  created_at: string;
}

export default function PatientHome() {
  const theme = useTheme();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profileData) throw new Error('Profile not found');

      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctor_patients')
        .select(`
          doctor:profiles!doctor_patients_doctor_id_fkey (
            id,
            full_name,
            email,
            specialty,
            created_at
          )
        `)
        .eq('patient_id', profileData.id)
        .eq('status', 'active');

      if (doctorsError) throw doctorsError;

      setDoctors(doctorsData.map(d => d.doctor));
    } catch (err) {
      console.error('Error loading doctors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.welcome}>
            Welcome back, John
          </Text>
        </View>

        <View style={styles.grid}>
          <Card style={styles.card} mode="elevated" onPress={() => router.push('/(app)/patient/symptom-check')}>
            <Card.Content>
              <Ionicons name="medical" size={32} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>AI Symptom Check</Text>
              <Text variant="bodySmall">Describe your symptoms to get instant analysis</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained-tonal" onPress={() => router.push('/(app)/patient/symptom-check')}>Start Check</Button>
            </Card.Actions>
          </Card>

          <Card style={styles.card} mode="elevated" onPress={() => router.push('/(app)/patient/quick-relief')}>
            <Card.Content>
              <Ionicons name="medkit" size={32} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Quick Relief</Text>
              <Text variant="bodySmall">Get immediate relief suggestions</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained-tonal" onPress={() => router.push('/(app)/patient/quick-relief')}>Get Help</Button>
            </Card.Actions>
          </Card>

          <Card style={styles.card} mode="elevated" onPress={() => router.push('/(app)/patient/clinical-history')}>
            <Card.Content>
              <Ionicons name="document-text" size={32} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Clinical History</Text>
              <Text variant="bodySmall">View your medical records and visits</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained-tonal" onPress={() => router.push('/(app)/patient/clinical-history')}>View History</Button>
            </Card.Actions>
          </Card>

          <Card style={styles.card} mode="elevated" onPress={() => router.push('/(app)/patient/medication')}>
            <Card.Content>
              <Ionicons name="alarm" size={32} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Medication Reminder</Text>
              <Text variant="bodySmall">Track your medication schedule</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained-tonal" onPress={() => router.push('/(app)/patient/medication')}>View Reminders</Button>
            </Card.Actions>
          </Card>
        </View>

        <Text variant="headlineMedium" style={[styles.welcome, styles.sectionTitle]}>My Doctors</Text>
        
        {loading ? (
          <ActivityIndicator style={styles.loading} />
        ) : error ? (
          <Card style={styles.errorCard}>
            <Card.Content>
              <HelperText type="error" visible={true}>
                {error}
              </HelperText>
            </Card.Content>
          </Card>
        ) : doctors.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyLarge">No assigned doctors yet</Text>
            </Card.Content>
          </Card>
        ) : (
          doctors.map((doctor) => (
            <Card key={doctor.id} style={styles.doctorCard}>
              <Card.Content>
                <Text variant="titleMedium">{doctor.full_name}</Text>
                <Text variant="bodyMedium" style={styles.specialty}>{doctor.specialty}</Text>
                <Text variant="bodySmall" style={styles.email}>{doctor.email}</Text>
              </Card.Content>
              <Card.Actions>
                <Button 
                  mode="contained"
                  onPress={() => router.push(`/patient/chat/${doctor.id}`)}
                >
                  Chat with Doctor
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  welcome: {
    color: '#2196F3',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: '47%',
    marginBottom: 16,
  },
  cardTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  doctorCard: {
    marginBottom: 16,
  },
  specialty: {
    color: '#666',
    marginTop: 4,
  },
  email: {
    color: '#666',
    marginTop: 4,
  },
  loading: {
    marginTop: 20,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    marginBottom: 16,
  },
});
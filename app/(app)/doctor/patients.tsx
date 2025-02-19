import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, Portal, Modal, Divider, ActivityIndicator, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { router } from 'expo-router';

interface SymptomReport {
  id: string;
  patient_id: string;
  report_content: string;
  chat_history: any[];
  status: 'pending_review' | 'accepted' | 'rejected';
  created_at: string;
  patient: {
    full_name: string;
    email: string;
  };
}

interface Patient {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export default function Patients() {
  const [pendingReports, setPendingReports] = useState<SymptomReport[]>([]);
  const [activePatients, setActivePatients] = useState<Patient[]>([]);
  const [selectedReport, setSelectedReport] = useState<SymptomReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTestReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: patientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'patient')
        .limit(1)
        .single();

      if (profileError) throw profileError;

      const { error: reportError } = await supabase
        .from('symptom_reports')
        .insert({
          patient_id: patientProfile.id,
          report_content: 'Test patient symptoms: Headache and fever for 2 days',
          chat_history: [
            { role: 'user', content: 'I have a headache and fever' },
            { role: 'assistant', content: 'How long have you been experiencing these symptoms?' },
            { role: 'user', content: 'For about 2 days now' }
          ],
          status: 'pending_review'
        });

      if (reportError) throw reportError;

      await loadData();
    } catch (err) {
      console.error('Error creating test report:', err);
      setError(err instanceof Error ? err.message : 'Failed to create test report');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const { data: reports, error: reportsError } = await supabase
        .from('symptom_reports')
        .select(`
          id,
          patient_id,
          report_content,
          chat_history,
          status,
          created_at,
          patient:profiles!symptom_reports_patient_id_fkey (
            full_name,
            email
          )
        `)
        .eq('status', 'pending_review')
        .is('doctor_id', null)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      const { data: patients, error: patientsError } = await supabase
        .from('doctor_patients')
        .select(`
          patient:profiles!doctor_patients_patient_id_fkey (
            id,
            full_name,
            email,
            created_at
          )
        `)
        .eq('doctor_id', doctorProfile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (patientsError) throw patientsError;

      setPendingReports(reports || []);
      setActivePatients((patients || []).map(p => p.patient));
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptPatient = async (report: SymptomReport) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: doctorProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const { error: reportError } = await supabase
        .from('symptom_reports')
        .update({ 
          status: 'accepted',
          doctor_id: doctorProfile.id
        })
        .eq('id', report.id);

      if (reportError) throw reportError;

      const { error: relationError } = await supabase
        .from('doctor_patients')
        .insert({
          doctor_id: doctorProfile.id,
          patient_id: report.patient_id,
          status: 'active'
        });

      if (relationError) throw relationError;

      setSelectedReport(null);
      await loadData();
    } catch (err) {
      console.error('Error accepting patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept patient');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const reportsChannel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'symptom_reports'
        },
        () => loadData()
      )
      .subscribe();

    const patientsChannel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doctor_patients'
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(patientsChannel);
    };
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <HelperText type="error" visible={true}>
                {error}
              </HelperText>
            </Card.Content>
          </Card>
        )}

        <View style={styles.headerContainer}>
          <Text variant="headlineMedium" style={styles.title}>New Patient Requests</Text>
          <Button 
            mode="contained-tonal" 
            onPress={createTestReport}
            loading={loading}
            disabled={loading}
          >
            Create Test Request
          </Button>
        </View>

        {pendingReports.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyLarge">No pending patient requests</Text>
            </Card.Content>
          </Card>
        ) : (
          pendingReports.map((report) => (
            <Card key={report.id} style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium">{report.patient.full_name}</Text>
                <Text variant="bodyMedium">{report.patient.email}</Text>
                <Text variant="bodySmall" style={styles.date}>
                  Requested: {new Date(report.created_at).toLocaleDateString()}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button 
                  mode="contained" 
                  onPress={() => setSelectedReport(report)}
                >
                  View Details
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}

        <Divider style={styles.divider} />

        <Text variant="headlineMedium" style={styles.title}>Active Patients</Text>
        {activePatients.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyLarge">No active patients</Text>
            </Card.Content>
          </Card>
        ) : (
          activePatients.map((patient) => (
            <Card key={patient.id} style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium">{patient.full_name}</Text>
                <Text variant="bodyMedium">{patient.email}</Text>
                <Text variant="bodySmall" style={styles.date}>
                  Since: {new Date(patient.created_at).toLocaleDateString()}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button 
                  mode="contained"
                  onPress={() => router.push(`/doctor/chat/${patient.id}`)}
                >
                  View Details & Chat
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={!!selectedReport}
          onDismiss={() => setSelectedReport(null)}
          contentContainerStyle={styles.modalContent}
        >
          {selectedReport && (
            <Card>
              <Card.Content>
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Patient Report
                </Text>
                
                <Text variant="titleMedium" style={styles.modalSubtitle}>
                  Patient Information
                </Text>
                <Text variant="bodyLarge">{selectedReport.patient.full_name}</Text>
                <Text variant="bodyMedium">{selectedReport.patient.email}</Text>
                
                <Divider style={styles.modalDivider} />
                
                <Text variant="titleMedium" style={styles.modalSubtitle}>
                  Symptom Report
                </Text>
                <Text variant="bodyMedium" style={styles.reportContent}>
                  {selectedReport.report_content}
                </Text>

                <Button
                  mode="contained"
                  onPress={() => handleAcceptPatient(selectedReport)}
                  style={styles.acceptButton}
                  loading={loading}
                  disabled={loading}
                >
                  Accept Patient
                </Button>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => setSelectedReport(null)}>Close</Button>
              </Card.Actions>
            </Card>
          )}
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#2196F3',
  },
  card: {
    marginBottom: 16,
  },
  date: {
    color: '#666',
    marginTop: 8,
  },
  divider: {
    marginVertical: 24,
  },
  modalContent: {
    padding: 20,
    margin: 20,
  },
  modalTitle: {
    color: '#2196F3',
    marginBottom: 20,
  },
  modalSubtitle: {
    color: '#666',
    marginBottom: 8,
  },
  modalDivider: {
    marginVertical: 16,
  },
  reportContent: {
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 24,
  },
  acceptButton: {
    marginTop: 16,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    marginBottom: 16,
  },
});
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function DoctorHome() {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.welcome}>
            Welcome back, Dr. Smith
          </Text>
        </View>

        <View style={styles.grid}>
          <Card style={styles.card} mode="elevated" onPress={() => router.push('/(app)/doctor/appointments')}>
            <Card.Content>
              <Ionicons name="calendar" size={32} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Appointments</Text>
              <Text variant="bodySmall">Manage your appointments</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained-tonal" onPress={() => router.push('/(app)/doctor/appointments')}>View Schedule</Button>
            </Card.Actions>
          </Card>

          <Card style={styles.card} mode="elevated" onPress={() => router.push('/(app)/doctor/patients')}>
            <Card.Content>
              <Ionicons name="people" size={32} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>My Patients</Text>
              <Text variant="bodySmall">View patient records</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained-tonal" onPress={() => router.push('/(app)/doctor/patients')}>View Patients</Button>
            </Card.Actions>
          </Card>

          <Card style={styles.card} mode="elevated" onPress={() => router.push('/(app)/doctor/prescriptions')}>
            <Card.Content>
              <Ionicons name="document-text" size={32} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Prescriptions</Text>
              <Text variant="bodySmall">Manage prescriptions</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained-tonal" onPress={() => router.push('/(app)/doctor/prescriptions')}>View All</Button>
            </Card.Actions>
          </Card>

          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Ionicons name="stats-chart" size={32} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Analytics</Text>
              <Text variant="bodySmall">View your statistics</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained-tonal">View Stats</Button>
            </Card.Actions>
          </Card>
        </View>
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
});
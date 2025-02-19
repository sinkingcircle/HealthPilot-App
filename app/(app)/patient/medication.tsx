import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Medication() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={styles.title}>Medication Reminders</Text>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="bodyLarge">
              Manage your medication schedule and set up reminders for your prescriptions.
            </Text>
          </Card.Content>
        </Card>
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
  title: {
    marginBottom: 20,
    color: '#2196F3',
  },
  card: {
    marginBottom: 16,
  },
});
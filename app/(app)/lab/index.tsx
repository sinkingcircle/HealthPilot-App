import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function LabHome() {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.welcome}>
            Welcome to Lab Dashboard
          </Text>
        </View>

        <View style={styles.grid}>
          <Card style={styles.card} mode="elevated" onPress={() => router.push('/(app)/lab/upload')}>
            <Card.Content>
              <Ionicons name="cloud-upload" size={32} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>Upload Documents</Text>
              <Text variant="bodySmall">Upload CT scans and medical images for analysis</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained-tonal" onPress={() => router.push('/(app)/lab/upload')}>
                Upload Now
              </Button>
            </Card.Actions>
          </Card>

          <Card style={styles.card} mode="elevated" onPress={() => router.push('/(app)/lab/analysis')}>
            <Card.Content>
              <Ionicons name="analytics" size={32} color={theme.colors.primary} />
              <Text variant="titleMedium" style={styles.cardTitle}>View Analysis</Text>
              <Text variant="bodySmall">Review AI analysis of uploaded images</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained-tonal" onPress={() => router.push('/(app)/lab/analysis')}>
                View Reports
              </Button>
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
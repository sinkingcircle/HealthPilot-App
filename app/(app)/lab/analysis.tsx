import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, RefreshControl } from 'react-native';
import { Text, Card, Button, ActivityIndicator, HelperText, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';

interface AnalysisDocument {
  id: string;
  image_url: string;
  analysis: string;
  document_type: string;
  created_at: string;
}

export default function Analysis() {
  const [documents, setDocuments] = useState<AnalysisDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AnalysisDocument | null>(null);

  const loadDocuments = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: labProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!labProfile) throw new Error('Lab profile not found');

      const { data: docs, error: docsError } = await supabase
        .from('lab_documents')
        .select('*')
        .eq('lab_id', labProfile.id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docs || []);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDocuments();
  }, []);

  useEffect(() => {
    loadDocuments();
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
        <Text variant="headlineMedium" style={styles.title}>Analysis Reports</Text>

        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <HelperText type="error" visible={true}>
                {error}
              </HelperText>
            </Card.Content>
          </Card>
        )}

        {documents.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyLarge">No analysis reports found</Text>
            </Card.Content>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} style={styles.card}>
              <Card.Content>
                <Image 
                  source={{ uri: doc.image_url }} 
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <Text variant="titleMedium" style={styles.documentTitle}>
                  {doc.document_type}
                </Text>
                <Text variant="bodySmall" style={styles.date}>
                  Analyzed: {new Date(doc.created_at).toLocaleDateString()}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button 
                  mode="contained"
                  onPress={() => setSelectedDocument(doc)}
                >
                  View Analysis
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={!!selectedDocument}
          onDismiss={() => setSelectedDocument(null)}
          contentContainerStyle={styles.modalContent}
        >
          {selectedDocument && (
            <Card>
              <Card.Content>
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Analysis Results
                </Text>
                
                <Image 
                  source={{ uri: selectedDocument.image_url }} 
                  style={styles.modalImage}
                  resizeMode="contain"
                />
                
                <Text variant="bodyMedium" style={styles.analysis}>
                  {selectedDocument.analysis}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => setSelectedDocument(null)}>Close</Button>
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
  title: {
    marginBottom: 20,
    color: '#2196F3',
  },
  card: {
    marginBottom: 16,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  documentTitle: {
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  date: {
    color: '#666',
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    marginBottom: 16,
  },
  modalContent: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: '90%',
  },
  modalTitle: {
    color: '#2196F3',
    marginBottom: 16,
  },
  modalImage: {
    width: '100%',
    height: 300,
    marginBottom: 16,
    borderRadius: 8,
  },
  analysis: {
    lineHeight: 24,
  },
});
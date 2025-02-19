import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { Text, Card, Button, ActivityIndicator, HelperText, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { createAIService } from '../../../lib/ai-service';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const aiService = createAIService(process.env.EXPO_PUBLIC_GITHUB_TOKEN!);

interface AnalysisResult {
  imageUrl: string;
  analysis: string;
}

export default function UploadDocuments() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setError(null);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to select image. Please try again.');
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    try {
      setLoading(true);
      setError(null);

      // Get current user's lab profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: labProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!labProfile) throw new Error('Lab profile not found');

      // Upload image to Supabase Storage
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lab-documents')
        .upload(filename, {
          uri: selectedImage,
          type: 'image/jpeg',
          name: 'image.jpg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('lab-documents')
        .getPublicUrl(filename);

      // Analyze image with AI
      const analysis = await aiService.analyzeImage(publicUrl);

      // Save to database
      const { error: dbError } = await supabase
        .from('lab_documents')
        .insert({
          lab_id: labProfile.id,
          image_url: publicUrl,
          analysis,
          document_type: 'medical_image'
        });

      if (dbError) throw dbError;

      setAnalysisResult({ imageUrl: publicUrl, analysis });
      setShowAnalysis(true);
    } catch (err) {
      console.error('Error analyzing image:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>Upload Medical Images</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Upload medical images for AI analysis
          </Text>
        </View>

        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <HelperText type="error" visible={true}>
                {error}
              </HelperText>
            </Card.Content>
          </Card>
        )}

        <ScrollView 
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <Card style={styles.uploadCard}>
            <Card.Content style={styles.uploadContent}>
              {selectedImage ? (
                <Image 
                  source={{ uri: selectedImage }} 
                  style={styles.selectedImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons name="cloud-upload" size={48} color="#2196F3" />
                  <Text variant="bodyLarge" style={styles.placeholderText}>
                    Select a medical image to upload
                  </Text>
                </View>
              )}
            </Card.Content>
            <Card.Actions style={styles.actions}>
              <Button 
                mode="contained" 
                onPress={pickImage}
                style={styles.button}
                disabled={loading}
              >
                Select Image
              </Button>
              {selectedImage && (
                <Button 
                  mode="contained" 
                  onPress={analyzeImage}
                  style={styles.button}
                  loading={loading}
                  disabled={loading}
                >
                  Analyze Image
                </Button>
              )}
            </Card.Actions>
          </Card>
        </ScrollView>

        <Portal>
          <Modal
            visible={showAnalysis}
            onDismiss={() => setShowAnalysis(false)}
            contentContainerStyle={styles.modalContent}
          >
            {analysisResult && (
              <Card>
                <Card.Content>
                  <Text variant="titleLarge" style={styles.modalTitle}>
                    Analysis Results
                  </Text>
                  
                  <Image 
                    source={{ uri: analysisResult.imageUrl }} 
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                  
                  <Text variant="bodyMedium" style={styles.analysis}>
                    {analysisResult.analysis}
                  </Text>
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => setShowAnalysis(false)}>Close</Button>
                </Card.Actions>
              </Card>
            )}
          </Modal>
        </Portal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    color: '#2196F3',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  uploadCard: {
    marginBottom: 16,
  },
  uploadContent: {
    alignItems: 'center',
    padding: 16,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  placeholderText: {
    marginTop: 16,
    color: '#666',
  },
  selectedImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#FFEBEE',
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
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
  },
  analysis: {
    lineHeight: 24,
  },
});
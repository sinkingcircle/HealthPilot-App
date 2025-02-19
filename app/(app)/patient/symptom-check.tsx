import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator, HelperText, Portal, Modal, Banner, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { createAIService } from '../../../lib/ai-service';
import { Ionicons } from '@expo/vector-icons';

const aiService = createAIService(process.env.EXPO_PUBLIC_GITHUB_TOKEN!);

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function SymptomCheck() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [isConsultationComplete, setIsConsultationComplete] = useState(false);
  const [showConsultButton, setShowConsultButton] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadChatHistory(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const loadChatHistory = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('messages')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setChatHistory(data.messages as Message[]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setError('Failed to load chat history. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !userId) return;

    try {
      setIsLoading(true);
      setError(null);
      const userMessage = message.trim();
      setMessage('');

      // Check if the user wants a doctor
      if (userMessage.toLowerCase().includes('i want a doctor') || 
          userMessage.toLowerCase().includes('need a doctor') ||
          userMessage.toLowerCase().includes('see a doctor')) {
        setShowConsultButton(true);
      }

      const updatedHistory = [...chatHistory, { role: 'user', content: userMessage }];
      setChatHistory(updatedHistory);

      const aiResponse = await aiService.analyzeSymptoms(updatedHistory);
      
      // Check if consultation is requested
      if (aiResponse.startsWith('CONSULTATION_REQUESTED')) {
        setShowConsultButton(true);
        const cleanResponse = aiResponse.replace('CONSULTATION_REQUESTED', '').trim();
        const finalHistory = [...updatedHistory, { role: 'assistant', content: cleanResponse }];
        setChatHistory(finalHistory);
      } else {
        const finalHistory = [...updatedHistory, { role: 'assistant', content: aiResponse }];
        setChatHistory(finalHistory);
      }

      // Check if the AI indicates the consultation is complete
      if (aiResponse.toLowerCase().includes('final report') || 
          aiResponse.toLowerCase().includes('consultation complete')) {
        setIsConsultationComplete(true);
        setFinalReport(aiResponse);
      }

      await aiService.saveChatHistory(userId, chatHistory);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestConsultation = async () => {
    if (!userId || !chatHistory.length) return;

    try {
      setIsLoading(true);
      const lastAIResponse = chatHistory[chatHistory.length - 1].content;
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profileData) throw new Error('Profile not found');

      const { error } = await supabase
        .from('symptom_reports')
        .insert({
          patient_id: profileData.id,
          report_content: lastAIResponse,
          chat_history: chatHistory,
          status: 'pending_review'
        });

      if (error) throw error;
      setShowSummary(true);
      setReportStatus('pending');
      setShowConsultButton(false);
    } catch (error) {
      console.error('Error requesting consultation:', error);
      setError('Failed to request consultation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>AI Symptom Analyzer</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Describe your symptoms and I'll help analyze them
          </Text>
        </View>

        {showConsultButton && (
          <Card style={styles.consultCard}>
            <Card.Content style={styles.consultContent}>
              <Ionicons name="medical" size={32} color="#2196F3" />
              <Text variant="titleMedium" style={styles.consultTitle}>
                Would you like to consult with a doctor?
              </Text>
              <Text variant="bodyMedium" style={styles.consultText}>
                A doctor will review your symptoms and provide professional medical advice.
              </Text>
              <Button 
                mode="contained"
                onPress={handleRequestConsultation}
                style={styles.consultButton}
                loading={isLoading}
                disabled={isLoading}
              >
                Request Doctor Consultation
              </Button>
            </Card.Content>
          </Card>
        )}

        <ScrollView 
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
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

          {chatHistory.map((msg, index) => (
            <Card 
              key={index} 
              style={[
                styles.messageCard,
                msg.role === 'user' ? styles.userMessage : styles.aiMessage
              ]}
            >
              <Card.Content>
                <Text variant="bodyMedium">{msg.content}</Text>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your symptoms..."
            mode="outlined"
            multiline
            style={styles.input}
            right={isLoading ? <TextInput.Icon icon={() => <ActivityIndicator size={20} />} /> : null}
          />
          <Button 
            mode="contained" 
            onPress={handleSendMessage}
            disabled={isLoading || !message.trim()}
            style={styles.sendButton}
            loading={isLoading}
          >
            Send
          </Button>
        </View>

        <Portal>
          <Modal
            visible={showSummary}
            onDismiss={() => setShowSummary(false)}
            contentContainerStyle={styles.modalContent}
          >
            <Card>
              <Card.Content>
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Consultation Request Sent
                </Text>
                <Text variant="bodyLarge" style={styles.modalText}>
                  Your symptom report has been sent to our doctors for review. You will be notified when a doctor accepts your case.
                </Text>
                <Text variant="bodyMedium" style={styles.modalSummary}>
                  {finalReport}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => setShowSummary(false)}>Close</Button>
              </Card.Actions>
            </Card>
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
  consultCard: {
    margin: 16,
    backgroundColor: '#E3F2FD',
  },
  consultContent: {
    alignItems: 'center',
    padding: 16,
  },
  consultTitle: {
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  consultText: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  consultButton: {
    width: '100%',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  chatContent: {
    padding: 16,
    gap: 12,
  },
  messageCard: {
    marginBottom: 8,
  },
  userMessage: {
    backgroundColor: '#E3F2FD',
    marginLeft: 40,
  },
  aiMessage: {
    backgroundColor: '#fff',
    marginRight: 40,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    marginBottom: 8,
  },
  sendButton: {
    marginTop: 8,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    marginBottom: 16,
  },
  modalContent: {
    padding: 20,
    margin: 20,
  },
  modalTitle: {
    color: '#2196F3',
    marginBottom: 16,
  },
  modalText: {
    marginBottom: 16,
  },
  modalSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
});
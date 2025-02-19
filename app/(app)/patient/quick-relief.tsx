import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, Button, TextInput, ActivityIndicator, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAIService } from '../../../lib/ai-service';

const aiService = createAIService(process.env.EXPO_PUBLIC_GITHUB_TOKEN!);

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_RELIEF_PROMPT = `You are a medical assistant focused on providing safe, non-prescription remedies and home treatments. Your role is to:

1. Provide ONLY non-prescription remedies and home treatments
2. Focus on immediate relief suggestions using common household items
3. NEVER recommend prescription medications
4. Always include lifestyle and preventive advice
5. Clearly state when professional medical attention is needed
6. Provide evidence-based natural remedies when applicable
7. Include preparation instructions for home remedies
8. Emphasize safety precautions and potential allergens
9. At the starting state im only here to provide quick remides and not diagnoise you.

Important rules:
- Dont ask follow up questions and instantly provide remidies
- Only answer questions about minor ailments and symptoms
- Always recommend seeking medical attention for serious conditions
- Never diagnose conditions
- Never recommend supplements without mentioning potential risks
- Always mention when a condition requires professional medical evaluation
- Keep responses focused on immediate relief and home care
- Include clear warnings about when to seek emergency care`;

export default function QuickRelief() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Hello! I can help you find quick relief for minor health issues using safe, non-prescription remedies and home treatments. What symptoms are you experiencing?'
  }]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      const userMessage = newMessage.trim();
      setNewMessage('');

      const updatedMessages = [...messages, { role: 'user', content: userMessage }];
      setMessages(updatedMessages);

      const chatHistory = [
        { role: 'system', content: QUICK_RELIEF_PROMPT },
        ...updatedMessages
      ];

      const aiResponse = await aiService.analyzeSymptoms(chatHistory);
      setMessages([...updatedMessages, { role: 'assistant', content: aiResponse }]);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
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
          <Text variant="headlineMedium" style={styles.title}>Quick Relief Assistant</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Get safe home remedies and non-prescription relief suggestions
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
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message, index) => (
            <Card 
              key={index} 
              style={[
                styles.messageCard,
                message.role === 'user' ? styles.userMessage : styles.aiMessage
              ]}
            >
              <Card.Content>
                <Text variant="bodyMedium">{message.content}</Text>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Describe your symptoms for quick relief suggestions..."
            mode="outlined"
            multiline
            style={styles.input}
            right={isLoading ? <TextInput.Icon icon={() => <ActivityIndicator size={20} />} /> : null}
          />
          <Button 
            mode="contained" 
            onPress={handleSendMessage}
            disabled={isLoading || !newMessage.trim()}
            style={styles.sendButton}
            loading={isLoading}
          >
            Send
          </Button>
        </View>
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
    backgroundColor: '#E8F5E9',
    marginLeft: 40,
  },
  aiMessage: {
    backgroundColor: '#E3F2FD',
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
    margin: 16,
  },
});
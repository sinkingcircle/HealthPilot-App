import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, TextInput, Button, ActivityIndicator, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../lib/supabase';

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: {
    full_name: string;
  };
}

interface Doctor {
  id: string;
  full_name: string;
  email: string;
  specialty: string;
}

export default function PatientChat() {
  const { id } = useLocalSearchParams();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const loadDoctor = async () => {
    try {
      const { data: doctorData, error: doctorError } = await supabase
        .from('profiles')
        .select('id, full_name, email, specialty')
        .eq('id', id)
        .single();

      if (doctorError) throw doctorError;
      setDoctor(doctorData);
    } catch (err) {
      console.error('Error loading doctor:', err);
      setError('Failed to load doctor information');
    }
  };

  const loadMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!patientProfile) throw new Error('Patient profile not found');

      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          sender:profiles!chat_messages_sender_id_fkey (
            full_name
          )
        `)
        .eq('doctor_id', id)
        .eq('patient_id', patientProfile.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messages || []);
      setTimeout(scrollToBottom, 100);

      // Subscribe to new messages
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `doctor_id=eq.${id}&patient_id=eq.${patientProfile.id}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as ChatMessage]);
            setTimeout(scrollToBottom, 100);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !doctor) return;

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: patientProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!patientProfile) throw new Error('Patient profile not found');

      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          doctor_id: doctor.id,
          patient_id: patientProfile.id,
          content: newMessage.trim(),
          sender_id: patientProfile.id
        });

      if (messageError) throw messageError;
      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadDoctor();
    loadMessages();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Chat with Dr. {doctor?.full_name}
        </Text>
        {doctor?.specialty && (
          <Text variant="bodyMedium" style={styles.subtitle}>
            {doctor.specialty}
          </Text>
        )}
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
        onContentSizeChange={scrollToBottom}
      >
        {messages.map((message) => (
          <View 
            key={message.id} 
            style={[
              styles.messageContainer,
              message.sender_id === doctor?.id ? styles.doctorMessage : styles.patientMessage
            ]}
          >
            <Text variant="bodySmall" style={styles.messageSender}>
              {message.sender.full_name}
            </Text>
            <Text variant="bodyMedium" style={styles.messageContent}>
              {message.content}
            </Text>
            <Text variant="bodySmall" style={styles.messageTime}>
              {new Date(message.created_at).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your message..."
            mode="outlined"
            style={styles.input}
            multiline
          />
          <Button 
            mode="contained" 
            onPress={sendMessage}
            disabled={sending || !newMessage.trim()}
            loading={sending}
            style={styles.sendButton}
          >
            Send
          </Button>
        </View>
      </View>
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
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    color: '#2196F3',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#FFEBEE',
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    maxWidth: '80%',
  },
  patientMessage: {
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-end',
  },
  doctorMessage: {
    backgroundColor: '#E3F2FD',
    alignSelf: 'flex-start',
  },
  messageSender: {
    color: '#666',
    marginBottom: 4,
  },
  messageContent: {
    marginBottom: 4,
  },
  messageTime: {
    color: '#666',
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
  },
  sendButton: {
    borderRadius: 20,
  },
});
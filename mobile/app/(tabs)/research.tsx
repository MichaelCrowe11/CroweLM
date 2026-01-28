import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ResearchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hello! I\'m CroweLM, your biotech research assistant. I can help you with:\n\n' +
        '- Drug target analysis\n' +
        '- Molecular property prediction\n' +
        '- Literature research\n' +
        '- Drug discovery workflows\n\n' +
        'What would you like to explore today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiClient.chat(input.trim());

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API connection and try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.role === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.role === 'user'
                  ? { backgroundColor: '#3b82f6' }
                  : { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user'
                    ? { color: '#ffffff' }
                    : { color: isDark ? '#f1f5f9' : '#1e293b' },
                ]}
              >
                {message.content}
              </Text>
            </View>
          </View>
        ))}

        {isLoading && (
          <View style={[styles.messageContainer, styles.assistantMessage]}>
            <View
              style={[
                styles.messageBubble,
                { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
              ]}
            >
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#334155' : '#f1f5f9',
              color: isDark ? '#f1f5f9' : '#1e293b',
            },
          ]}
          placeholder="Ask about drug discovery..."
          placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { opacity: input.trim() && !isLoading ? 1 : 0.5 },
          ]}
          onPress={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          <Ionicons name="send" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

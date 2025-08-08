// mobile-app/screens/Chat.js

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const CHAT_KEY = '@chat_messages';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef();

  // Load persisted messages on mount
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(CHAT_KEY);
        if (json) {
          setMessages(JSON.parse(json));
        } else {
          setMessages([
            { id: '1', text: 'Hi! How can I help you today?', sender: 'bot' }
          ]);
        }
      } catch (e) {
        console.warn('Failed to load chat', e);
      }
    })();
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    AsyncStorage.setItem(CHAT_KEY, JSON.stringify(messages)).catch(e =>
      console.warn('Failed to save chat', e)
    );
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user'
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Placeholder bot reply
    setTimeout(() => {
      const botMsg = {
        id: Date.now().toString(),
        text: "Here's a placeholder reply.",
        sender: 'bot'
      };
      setMessages(prev => [...prev, botMsg]);
      setIsLoading(false);
    }, 1000);
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.bubble,
        item.sender === 'user' ? styles.userBubble : styles.botBubble
      ]}
    >
      <Text style={styles.bubbleText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatContainer}
      />

      {isLoading && <ActivityIndicator style={styles.loading} size="small" />}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chatContainer: { padding: 12, paddingBottom: 0 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12, marginVertical: 6 },
  userBubble: { backgroundColor: '#467fd0', alignSelf: 'flex-end', borderBottomRightRadius: 0 },
  botBubble: { backgroundColor: '#e5e5ea', alignSelf: 'flex-start', borderBottomLeftRadius: 0 },
  bubbleText: { fontSize: 16, color: '#000' },
  loading: { marginVertical: 4 },
  inputRow: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#467fd0',
    borderRadius: 20,
    padding: 10
  }
});
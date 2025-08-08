// mobile-app/screens/ChatAI.js

import React, { useState, useRef, useEffect, useContext, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { fetchClaudeResponse } from '../utils/claude';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';

/* ──────────────────────────────────────────────────────────────── */
/*  Constants                                                      */
/* ──────────────────────────────────────────────────────────────── */
const initialBotGreeting = {
  id: 'greeting-initial-bot-message',
  text: 'Welcome to FitnessCoach! How can I help you today?',
  sender: 'bot',
};
const CHAT_KEY = (email) => `@${email}:chat_messages`;

/* ──────────────────────────────────────────────────────────────── */
/*  Component                                                      */
/* ──────────────────────────────────────────────────────────────── */
export default function ChatAI({ navigation }) {
  const { user }  = useContext(AuthContext);
  const { chatLogs, saveChatLogs, clearChatLogs, syncStatus } = useContext(DataContext);
  const storageKey = CHAT_KEY(user.email);

  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef();
  const [keyboardHeight, setKeyboardHeight] = useState(0);


  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  /* ───── Load messages from DataContext ───── */
  useEffect(() => {
    if (chatLogs.length === 0) {
      // If no chat logs exist, show greeting
      setMessages([initialBotGreeting]);
    } else {
      // Check if greeting already exists to prevent duplicates
      const hasGreeting = chatLogs.some(msg => 
        msg.id === initialBotGreeting.id
      );
      
      if (hasGreeting) {
        // Greeting exists, use chatLogs as-is
        setMessages(chatLogs);
      } else {
        // No greeting found, add it at the beginning
        setMessages([initialBotGreeting, ...chatLogs]);
      }
    }
  }, [chatLogs]);

  /* ───── Persist messages through DataContext ───── */
  useEffect(() => {
    // Only save if we have actual conversation (not just greeting) and data has changed
    const hasRealConversation = messages.length > 1 || 
      (messages.length === 1 && !messages[0].text.includes('Welcome to FitnessCoach'));
    
    if (hasRealConversation && messages !== chatLogs && JSON.stringify(messages) !== JSON.stringify(chatLogs)) {
      saveChatLogs(messages).catch((e) =>
        console.warn('Failed to save chat', e)
      );
    }
  }, [messages, saveChatLogs, chatLogs]);

  /* ───── Auto-scroll ───── */
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  /* ───── Header delete button ───── */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
          <Ionicons 
            name={syncStatus === 'synced' ? 'cloud-done' : syncStatus === 'syncing' ? 'cloud-upload' : 'cloud-offline'} 
            size={16} 
            color={syncStatus === 'synced' ? '#4CAF50' : syncStatus === 'syncing' ? '#FF9800' : '#fff'} 
            style={{ marginRight: 8 }}
          />
          <TouchableOpacity onPress={clearConversation}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
      title: 'Chat',
      headerStyle: { backgroundColor: '#467fd0' },
      headerTintColor: '#fff',
    });
  }, [navigation, syncStatus]);

  /* ───── Helpers ───── */
  const clearConversation = () => {
    Alert.alert('Delete conversation?', 'This will erase all messages.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearChatLogs();
            // Reset to initial greeting
            setMessages([initialBotGreeting]);
          } catch (error) {
            Alert.alert('Error', 'Failed to clear conversation');
          }
        },
      },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), text: input.trim(), sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const replyText = await fetchClaudeResponse([...messages, userMsg]);
      const botMsg = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.bubble,
        item.sender === 'user' ? styles.userBubble : styles.botBubble,
      ]}
    >
      <Text style={styles.bubbleText}>{item.text}</Text>
    </View>
  );

  /* ───── UI ───── */
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: 'padding' })}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={[styles.chatContainer, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 25 : 0 }]}
      />

      {isLoading && <ActivityIndicator style={styles.loading} size="small" />}

      <View style={[styles.inputRow, { paddingBottom: keyboardHeight > 0 ? 25 : 8 }]}>
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

/* ──────────────────────────────────────────────────────────────── */
/*  Styles                                                         */
/* ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chatContainer: { padding: 12, paddingBottom: 0 },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12, marginVertical: 6 },
  userBubble: {
    backgroundColor: '#467fd0',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  botBubble: {
    backgroundColor: '#e5e5ea',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
  },
  bubbleText: { fontSize: 16, color: '#000' },
  loading: { marginVertical: 4 },
  inputRow: {
    flexDirection: 'row',
    padding: 8,
    paddingBottom: 8, // Default value when keyboard is hidden
    borderTopWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#467fd0',
    borderRadius: 20,
    padding: 10,
  },
});

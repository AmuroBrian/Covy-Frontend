import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { Colors } from '../../../src/theme/colors';
import { useRealtime } from '../../../src/context/RealtimeContext';
import { useAuth } from '../../../src/context/AuthContext';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const { messages, sendMessage, reactToMessage, fetchMessageHistory } = useRealtime();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Extract partner from profile
  const partner = profile?.couple?.users?.find((u: any) => u.id !== profile.id);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    fetchMessageHistory();
  }, []);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleReaction = (emoji: string) => {
    if (reactionMessageId) {
      reactToMessage(reactionMessageId, emoji);
      setReactionMessageId(null);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

  // Start of conversation header
  const renderListHeader = () => {
    return (
      <View style={styles.listHeaderContainer}>
        {partner?.avatarUrl ? (
          <Image source={{ uri: partner.avatarUrl }} style={styles.largeAvatar} />
        ) : (
          <View style={styles.largeAvatarPlaceholder}>
            <Ionicons name="person" size={50} color={Colors.white} />
          </View>
        )}
        <Text style={styles.largeName}>{partner?.displayName || 'Partner'}</Text>
        <Text style={styles.startSubtitle}>Your conversation starts here</Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === profile?.id;
    const hasReactions = item.reactions && item.reactions.length > 0;

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowPartner]}>
        
        {/* Partner Avatar - only show for partner messages */}
        {!isMe && (
          partner?.avatarUrl ? (
            <Image source={{ uri: partner.avatarUrl }} style={styles.smallAvatar} />
          ) : (
            <View style={styles.smallAvatarPlaceholder}>
              <Ionicons name="person" size={14} color={Colors.white} />
            </View>
          )
        )}

        {/* Message Wrapper (holds bubble + reactions + meta) */}
        <View style={[styles.messageContentWrapper, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
          
          {/* Bubble + Reactions relative container */}
          <View>
            <TouchableOpacity 
              activeOpacity={0.8}
              onLongPress={() => setReactionMessageId(item.id)}
              style={[styles.messageBubble, isMe ? styles.myMessage : styles.partnerMessage]}
            >
              <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.partnerMessageText]}>
                {item.content || item.text}
              </Text>
            </TouchableOpacity>

            {/* Reactions sitting perfectly on the corner of the bubble */}
            {hasReactions && (
              <View style={[styles.reactionsContainer, isMe ? styles.myReactions : styles.partnerReactions]}>
                {item.reactions.map((r: any, idx: number) => (
                  <View key={idx} style={styles.reactionBadge}>
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Timestamp and Delivered Status below the bubble */}
          <View style={[styles.messageMeta, isMe ? { justifyContent: 'flex-end', paddingRight: 5 } : { justifyContent: 'flex-start', paddingLeft: 5 }]}>
            <Text style={styles.metaText}>{formatTime(item.createdAt)}</Text>
            {isMe && (
              <Text style={[styles.metaText, { marginLeft: 5 }]}>
                • {item.isRead ? 'Seen' : 'Delivered'}
              </Text>
            )}
          </View>

        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <Ionicons name="chevron-back" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
             <Image source={require('../../../assets/images/covylogo.png')} style={styles.headerLogo} resizeMode="contain" />
             <Text style={styles.headerTitle}>My Partner Conversation</Text>
          </View>
          <View style={{ width: 40 }} /> {/* Spacer to balance back button */}
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderMessage}
          inverted // Messages appear from the bottom up
          contentContainerStyle={[styles.messageList, { paddingBottom: 20, paddingTop: 20 }]}
          ListFooterComponent={renderListHeader} // Footer is at the TOP visually when inverted!
        />

        {/* INPUT */}
        <View style={[
            styles.inputContainer, 
            { paddingBottom: isKeyboardVisible || Platform.OS === 'android' ? 15 : Math.max(insets.bottom + 75, 95) }
          ]}
        >
          <TextInput
            style={styles.textInput}
            placeholder="Message..."
            placeholderTextColor={Colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={18} color={Colors.white} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        {/* Reaction Picker Overlay */}
        {reactionMessageId && (
          <Modal transparent animationType="fade">
            <TouchableWithoutFeedback onPress={() => setReactionMessageId(null)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.reactionPicker}>
                    {REACTION_EMOJIS.map(emoji => (
                      <TouchableOpacity key={emoji} onPress={() => handleReaction(emoji)} style={styles.reactionOption}>
                        <Text style={styles.reactionOptionText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, backgroundColor: Colors.surface },
  
  header: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  backButton: {
    padding: 5,
    width: 40,
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 60,
    height: 18,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, opacity: 0.8 },
  
  listHeaderContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  largeAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  largeName: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 5 },
  startSubtitle: { fontSize: 14, color: Colors.textLight },

  messageList: { paddingHorizontal: 15 },
  
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Aligns avatar to the bottom of the bubble
    marginBottom: 20, // Extra margin to accommodate floating reactions/meta
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowPartner: {
    justifyContent: 'flex-start',
  },
  
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 16, // Lift slightly above the meta text
  },
  smallAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 16,
  },
  
  messageContentWrapper: {
    maxWidth: '80%',
  },

  messageBubble: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 22, 
  },
  myMessage: { 
    backgroundColor: Colors.primary, 
    borderBottomRightRadius: 6,
  },
  partnerMessage: { 
    backgroundColor: Colors.white, 
    borderBottomLeftRadius: 6, 
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  myMessageText: { color: Colors.white },
  partnerMessageText: { color: Colors.text },
  
  messageMeta: {
    flexDirection: 'row',
    marginTop: 6,
    width: '100%',
  },
  metaText: { fontSize: 11, color: Colors.textLight },

  reactionsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -12, // Sits exactly on the edge of the bubble
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  myReactions: { right: 8 },
  partnerReactions: { left: 8 },
  reactionBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionEmoji: { fontSize: 14 },

  inputContainer: { 
    flexDirection: 'row', 
    padding: 15, 
    backgroundColor: Colors.white, 
    borderTopWidth: 1, 
    borderTopColor: Colors.border,
    alignItems: 'flex-end',
  },
  textInput: { 
    flex: 1, 
    backgroundColor: Colors.surface, 
    borderRadius: 20, 
    paddingHorizontal: 18, 
    paddingTop: 12,
    paddingBottom: 12, 
    fontSize: 16, 
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: { 
    marginLeft: 10, 
    backgroundColor: Colors.primary, 
    width: 44,
    height: 44,
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 2
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 30,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  reactionOption: {
    padding: 10,
  },
  reactionOptionText: {
    fontSize: 32,
  }
});

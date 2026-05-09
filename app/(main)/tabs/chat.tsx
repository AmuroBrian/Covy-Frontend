import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { Colors } from '../../../src/theme/colors';
import { useRealtime } from '../../../src/context/RealtimeContext';
import { useAuth } from '../../../src/context/AuthContext';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const { messages, sendMessage, reactToMessage, deleteMessage, fetchMessageHistory, partnerPresence, partnerLocation } = useRealtime();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

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
      sendMessage(inputText.trim(), replyingTo?.id);
      setInputText('');
      setReplyingTo(null);
    }
  };

  const handleReaction = (emoji: string) => {
    if (reactionMessageId) {
      reactToMessage(reactionMessageId, emoji);
      setReactionMessageId(null);
    }
  };

  const handleDelete = (messageId: string) => {
    deleteMessage(messageId);
    setReactionMessageId(null);
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

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

  const renderReplyAction = () => {
    return (
      <View style={styles.replyActionContainer}>
        <Ionicons name="arrow-undo" size={24} color={Colors.primary} />
      </View>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === profile?.id;
    const hasReactions = item.reactions && item.reactions.length > 0;

    return (
      <Swipeable
        ref={(ref) => { swipeableRefs.current[item.id] = ref; }}
        renderLeftActions={renderReplyAction}
        onSwipeableOpen={(direction) => {
          setReplyingTo(item);
          swipeableRefs.current[item.id]?.close();
        }}
      >
        <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowPartner]}>
          {!isMe && (
            partner?.avatarUrl ? (
              <Image source={{ uri: partner.avatarUrl }} style={styles.smallAvatar} />
            ) : (
              <View style={styles.smallAvatarPlaceholder}>
                <Ionicons name="person" size={14} color={Colors.white} />
              </View>
            )
          )}

          <View style={[styles.messageContentWrapper, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
            <View>
              <TouchableOpacity 
                activeOpacity={0.8}
                onLongPress={() => setReactionMessageId(item.id)}
                style={[styles.messageBubble, isMe ? styles.myMessage : styles.partnerMessage]}
              >
                {/* Quoted Reply Content */}
                {item.replyTo && (
                  <View style={[styles.quotedMessage, isMe ? styles.myQuoted : styles.partnerQuoted]}>
                    <Text style={[styles.quotedName, isMe ? styles.myQuotedText : styles.partnerQuotedText]} numberOfLines={1}>
                      {item.replyTo.senderId === profile?.id ? 'You' : partner?.displayName || 'Partner'}
                    </Text>
                    <Text style={[styles.quotedContent, isMe ? styles.myQuotedText : styles.partnerQuotedText]} numberOfLines={2}>
                      {item.replyTo.content}
                    </Text>
                  </View>
                )}

                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.partnerMessageText]}>
                  {item.content || item.text}
                </Text>
              </TouchableOpacity>

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

            <View style={[
              styles.messageMeta, 
              isMe ? { justifyContent: 'flex-end', paddingRight: 5 } : { justifyContent: 'flex-start', paddingLeft: 5 },
              hasReactions && { marginTop: 16 }
            ]}>
              <Text style={styles.metaText}>{formatTime(item.createdAt)}</Text>
              {isMe && (
                <Text style={[styles.metaText, { marginLeft: 5 }]}>
                  • {item.isRead ? 'Seen' : 'Delivered'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
           <View style={styles.headerLeft}>
             {partner?.avatarUrl ? (
               <Image source={{ uri: partner.avatarUrl }} style={styles.headerSmallAvatar} />
             ) : (
               <View style={styles.headerSmallAvatarPlaceholder}>
                 <Ionicons name="person" size={18} color={Colors.white} />
               </View>
             )}
             <Text style={styles.headerName}>{partner?.displayName || 'Partner'}</Text>
           </View>
           
           <View style={styles.presenceContainer}>
             <View style={[styles.statusDot, { backgroundColor: partnerPresence?.isOnline ? Colors.success : Colors.textLight }]} />
             <Text style={styles.presenceText}>
               {partnerPresence?.isOnline ? 'Active now' : 'Offline'}
               {partnerLocation ? ' • Location On' : ' • Location Off'}
             </Text>
           </View>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={[styles.messageList, { paddingBottom: 20, paddingTop: 20 }]}
          ListFooterComponent={renderListHeader}
        />

        <View style={[
            styles.inputContainerWrapper, 
            { paddingBottom: Platform.OS === 'ios' ? (isKeyboardVisible ? 15 : Math.max(insets.bottom + 75, 95)) : Math.max(insets.bottom + 75, 95) }
          ]}
        >
          {replyingTo && (
            <View style={styles.replyPreviewContainer}>
              <View style={styles.replyPreviewLine} />
              <View style={styles.replyPreviewContent}>
                <Text style={styles.replyPreviewName}>
                  Replying to {replyingTo.senderId === profile?.id ? 'Yourself' : partner?.displayName || 'Partner'}
                </Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {replyingTo.content}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.cancelReplyButton}>
                <Ionicons name="close-circle" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputContainer}>
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
        </View>

        {reactionMessageId && (
          <Modal transparent animationType="fade">
            <TouchableWithoutFeedback onPress={() => setReactionMessageId(null)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <View style={styles.reactionPicker}>
                      {REACTION_EMOJIS.map(emoji => (
                        <TouchableOpacity key={emoji} onPress={() => handleReaction(emoji)} style={styles.reactionOption}>
                          <Text style={styles.reactionOptionText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    {messages.find(m => m.id === reactionMessageId)?.senderId === profile?.id && (
                      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(reactionMessageId)}>
                        <Ionicons name="trash-outline" size={20} color={Colors.white} />
                        <Text style={styles.deleteButtonText}>Unsend Message</Text>
                      </TouchableOpacity>
                    )}
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
    paddingHorizontal: 15,
    paddingBottom: 12,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSmallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerSmallAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  presenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  presenceText: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
  },
  
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
    alignItems: 'flex-end',
    marginBottom: 20,
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
    marginBottom: 16,
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
    bottom: -12,
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

  inputContainerWrapper: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 15, 
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
  modalContent: {
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
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  deleteButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },

  replyActionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  quotedMessage: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  myQuoted: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderLeftColor: Colors.white,
  },
  partnerQuoted: {
    backgroundColor: Colors.surface,
    borderLeftColor: Colors.primary,
  },
  quotedName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  quotedContent: {
    fontSize: 14,
    opacity: 0.8,
  },
  myQuotedText: {
    color: Colors.white,
  },
  partnerQuotedText: {
    color: Colors.text,
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  replyPreviewLine: {
    width: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    alignSelf: 'stretch',
    marginRight: 10,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 14,
    color: Colors.text,
  },
  cancelReplyButton: {
    padding: 5,
  }
});

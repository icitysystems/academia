import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Button, TextInput, FAB, Avatar, IconButton, useTheme, Divider, Menu } from 'react-native-paper';
import { useQuery, useMutation, gql } from '@apollo/client';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../contexts/AuthContext';

const GET_DISCUSSIONS = gql`
  query GetDiscussions($courseId: ID!) {
    discussionThreads(courseId: $courseId) {
      id
      title
      content
      pinned
      locked
      createdAt
      author {
        id
        name
        avatar
      }
      replyCount
      lastActivity
    }
  }
`;

const GET_THREAD = gql`
  query GetThread($threadId: ID!) {
    discussionThread(id: $threadId) {
      id
      title
      content
      pinned
      locked
      createdAt
      author {
        id
        name
        avatar
      }
      posts {
        id
        content
        createdAt
        author {
          id
          name
          avatar
        }
      }
    }
  }
`;

const CREATE_THREAD = gql`
  mutation CreateThread($input: CreateThreadInput!) {
    createDiscussionThread(input: $input) {
      id
      title
    }
  }
`;

const CREATE_POST = gql`
  mutation CreatePost($threadId: ID!, $content: String!) {
    createDiscussionPost(threadId: $threadId, content: $content) {
      id
      content
    }
  }
`;

type RouteProps = RouteProp<RootStackParamList, 'Discussion'>;

const DiscussionScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { courseId, threadId: initialThreadId } = route.params;

  const [selectedThread, setSelectedThread] = useState<string | null>(initialThreadId || null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [replyContent, setReplyContent] = useState('');

  const { data: threadsData, loading: threadsLoading, refetch: refetchThreads } = useQuery(
    GET_DISCUSSIONS,
    { variables: { courseId } }
  );

  const { data: threadData, loading: threadLoading, refetch: refetchThread } = useQuery(
    GET_THREAD,
    { 
      variables: { threadId: selectedThread },
      skip: !selectedThread,
    }
  );

  const [createThread, { loading: creating }] = useMutation(CREATE_THREAD);
  const [createPost, { loading: posting }] = useMutation(CREATE_POST);

  const threads = threadsData?.discussionThreads || [];
  const thread = threadData?.discussionThread;

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim()) return;

    try {
      const { data } = await createThread({
        variables: {
          input: {
            courseId,
            title: newThreadTitle,
            content: newThreadContent,
          },
        },
      });
      setNewThreadTitle('');
      setNewThreadContent('');
      setShowNewThread(false);
      refetchThreads();
      setSelectedThread(data.createDiscussionThread.id);
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedThread) return;

    try {
      await createPost({
        variables: {
          threadId: selectedThread,
          content: replyContent,
        },
      });
      setReplyContent('');
      refetchThread();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Thread List View
  if (!selectedThread) {
    return (
      <View style={styles.container}>
        {showNewThread ? (
          <Card style={styles.newThreadCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                New Discussion
              </Text>
              <TextInput
                label="Title"
                value={newThreadTitle}
                onChangeText={setNewThreadTitle}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Content"
                value={newThreadContent}
                onChangeText={setNewThreadContent}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
              />
              <View style={styles.buttonRow}>
                <Button mode="outlined" onPress={() => setShowNewThread(false)}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCreateThread}
                  loading={creating}
                  disabled={!newThreadTitle.trim() || !newThreadContent.trim()}
                >
                  Create Thread
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={threadsLoading} onRefresh={refetchThreads} />
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card
                style={[styles.threadCard, item.pinned && styles.pinnedCard]}
                onPress={() => setSelectedThread(item.id)}
              >
                <Card.Content>
                  <View style={styles.threadHeader}>
                    <Avatar.Text
                      size={36}
                      label={item.author.name.charAt(0)}
                    />
                    <View style={styles.threadInfo}>
                      <Text variant="titleMedium" numberOfLines={1}>
                        {item.pinned && '📌 '}{item.title}
                      </Text>
                      <Text variant="bodySmall" style={styles.authorText}>
                        {item.author.name} • {formatDate(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <Text variant="bodyMedium" numberOfLines={2} style={styles.threadContent}>
                    {item.content}
                  </Text>
                  <View style={styles.threadFooter}>
                    <Text variant="labelSmall">
                      {item.replyCount} {item.replyCount === 1 ? 'reply' : 'replies'}
                    </Text>
                    {item.locked && <Text variant="labelSmall">🔒 Locked</Text>}
                  </View>
                </Card.Content>
              </Card>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No discussions yet
                </Text>
                <Text variant="bodySmall" style={styles.emptySubtext}>
                  Start the conversation!
                </Text>
              </View>
            }
          />
        )}

        {!showNewThread && (
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={() => setShowNewThread(true)}
          />
        )}
      </View>
    );
  }

  // Thread Detail View
  return (
    <View style={styles.container}>
      <FlatList
        data={thread?.posts || []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={threadLoading} onRefresh={refetchThread} />
        }
        ListHeaderComponent={
          thread ? (
            <Card style={styles.threadDetailCard}>
              <Card.Content>
                <View style={styles.threadHeader}>
                  <Avatar.Text
                    size={48}
                    label={thread.author.name.charAt(0)}
                  />
                  <View style={styles.threadInfo}>
                    <Text variant="titleLarge">{thread.title}</Text>
                    <Text variant="bodySmall">
                      {thread.author.name} • {formatDate(thread.createdAt)}
                    </Text>
                  </View>
                </View>
                <Divider style={styles.divider} />
                <Text variant="bodyMedium">{thread.content}</Text>
              </Card.Content>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.postCard}>
            <Card.Content>
              <View style={styles.postHeader}>
                <Avatar.Text size={32} label={item.author.name.charAt(0)} />
                <View style={styles.postInfo}>
                  <Text variant="titleSmall">{item.author.name}</Text>
                  <Text variant="labelSmall">{formatDate(item.createdAt)}</Text>
                </View>
              </View>
              <Text variant="bodyMedium" style={styles.postContent}>
                {item.content}
              </Text>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Reply Input */}
      {thread && !thread.locked && (
        <View style={styles.replyContainer}>
          <TextInput
            placeholder="Write a reply..."
            value={replyContent}
            onChangeText={setReplyContent}
            mode="outlined"
            style={styles.replyInput}
            right={
              <TextInput.Icon
                icon="send"
                onPress={handleReply}
                disabled={!replyContent.trim() || posting}
              />
            }
          />
        </View>
      )}

      {/* Back Button */}
      <FAB
        icon="arrow-left"
        size="small"
        style={styles.backFab}
        onPress={() => setSelectedThread(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  newThreadCard: {
    margin: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  threadCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  pinnedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  threadInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorText: {
    color: '#666',
    marginTop: 2,
  },
  threadContent: {
    color: '#666',
    marginBottom: 8,
  },
  threadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    color: '#666',
  },
  emptySubtext: {
    color: '#999',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  backFab: {
    position: 'absolute',
    left: 16,
    bottom: 16,
  },
  threadDetailCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  divider: {
    marginVertical: 16,
  },
  postCard: {
    marginBottom: 8,
    borderRadius: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postInfo: {
    marginLeft: 12,
  },
  postContent: {
    marginLeft: 44,
  },
  replyContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  replyInput: {
    backgroundColor: '#fff',
  },
});

export default DiscussionScreen;

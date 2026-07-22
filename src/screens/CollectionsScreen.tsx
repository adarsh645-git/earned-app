import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCollectionStore, CollectionCategory } from '../store/collectionStore';
import { useMacroGoalStore } from '../store/macroGoalStore';

export default function CollectionsScreen() {
  const { collections, items, addCollection, addItem, toggleItemCompletion, deleteItem } = useCollectionStore();
  const { macroGoals } = useMacroGoalStore();

  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionCategory, setCollectionCategory] = useState<CollectionCategory>('books');
  const [selectedMacroId, setSelectedMacroId] = useState('');

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemEstimatedMinutes, setItemEstimatedMinutes] = useState('');

  const handleCreateCollection = () => {
    if (!collectionTitle.trim()) return;
    addCollection({
      title: collectionTitle.trim(),
      category: collectionCategory,
      macroGoalId: selectedMacroId || undefined,
    });
    setCollectionTitle('');
    setSelectedMacroId('');
    setIsCollectionModalOpen(false);
  };

  const handleCreateItem = () => {
    if (!itemTitle.trim() || !activeCollectionId) return;
    const est = parseInt(itemEstimatedMinutes, 10);
    addItem({
      collectionId: activeCollectionId,
      title: itemTitle.trim(),
      estimatedMinutes: isNaN(est) ? undefined : est,
      isAddedLater: true, // Always true if added from the UI after initial batch
    });
    setItemTitle('');
    setItemEstimatedMinutes('');
    setIsItemModalOpen(false);
  };

  const categories = ['books', 'games', 'stocks', 'fitness', 'courses', 'travel', 'other'] as CollectionCategory[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#FFFFFF' }}>Journeys</Text>
        <Pressable onPress={() => setIsCollectionModalOpen(true)} style={{ backgroundColor: '#AF52DE', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="add" size={24} color="#FFF" />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {collections.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="list" size={48} color="#3A3A3C" />
            <Text style={{ color: '#8E8E93', marginTop: 16, fontSize: 16, textAlign: 'center' }}>
              No journeys yet. Create one to start tracking books, games, or long-term lists.
            </Text>
          </View>
        ) : (
          collections.map(collection => {
            const collectionItems = items.filter(i => i.collectionId === collection.id);
            const completedCount = collectionItems.filter(i => i.completed).length;
            const progress = collectionItems.length > 0 ? Math.round((completedCount / collectionItems.length) * 100) : 0;

            return (
              <View key={collection.id} style={{ marginBottom: 24, backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View>
                    <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>{collection.title}</Text>
                    <Text style={{ color: '#8E8E93', fontSize: 12, textTransform: 'capitalize', marginTop: 2 }}>{collection.category}</Text>
                  </View>
                  <Text style={{ color: '#AF52DE', fontSize: 14, fontWeight: '600' }}>{completedCount}/{collectionItems.length} ({progress}%)</Text>
                </View>

                {collectionItems.map(item => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#2C2C2E' }}>
                    <Pressable onPress={() => toggleItemCompletion(item.id)} style={{ marginRight: 12 }}>
                      <Ionicons 
                        name={item.completed ? "checkmark-circle" : "ellipse-outline"} 
                        size={24} 
                        color={item.completed ? "#AF52DE" : "#8E8E93"} 
                      />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: item.completed ? '#8E8E93' : '#FFF', fontSize: 16, textDecorationLine: item.completed ? 'line-through' : 'none' }}>
                        {item.title}
                      </Text>
                      {item.isAddedLater && (
                        <Text style={{ color: '#5AC8FA', fontSize: 10, marginTop: 2 }}>Added Later</Text>
                      )}
                    </View>
                    <Pressable onPress={() => deleteItem(item.id)}>
                      <Ionicons name="trash-outline" size={20} color="#FF453A" />
                    </Pressable>
                  </View>
                ))}

                <Pressable 
                  onPress={() => {
                    setActiveCollectionId(collection.id);
                    setIsItemModalOpen(true);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2C2C2E' }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#AF52DE" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#AF52DE', fontSize: 14, fontWeight: '600' }}>Add Item</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create Collection Modal */}
      <Modal visible={isCollectionModalOpen} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 400 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700' }}>New Journey</Text>
              <Pressable onPress={() => setIsCollectionModalOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Title</Text>
            <TextInput
              style={{ backgroundColor: '#2C2C2E', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 }}
              placeholder="e.g., Reading List 2026"
              placeholderTextColor="#8E8E93"
              value={collectionTitle}
              onChangeText={setCollectionTitle}
              autoFocus
            />

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              {categories.map(c => (
                <Pressable 
                  key={c}
                  onPress={() => setCollectionCategory(c)}
                  style={{ 
                    backgroundColor: collectionCategory === c ? '#AF52DE' : '#2C2C2E',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600', textTransform: 'capitalize' }}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Link to Macro Goal (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }}>
              <Pressable
                onPress={() => setSelectedMacroId('')}
                style={{
                  backgroundColor: selectedMacroId === '' ? '#AF52DE' : '#2C2C2E',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '600' }}>None</Text>
              </Pressable>
              {macroGoals.map((mg) => (
                <Pressable
                  key={mg.id}
                  onPress={() => setSelectedMacroId(mg.id)}
                  style={{
                    backgroundColor: selectedMacroId === mg.id ? '#AF52DE' : '#2C2C2E',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>{mg.title}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={handleCreateCollection}
              style={{ backgroundColor: '#AF52DE', padding: 16, borderRadius: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Create Journey</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Create Item Modal */}
      <Modal visible={isItemModalOpen} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700' }}>Add Item</Text>
              <Pressable onPress={() => setIsItemModalOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Item Name</Text>
            <TextInput
              style={{ backgroundColor: '#2C2C2E', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16 }}
              placeholder="e.g., The Great Gatsby"
              placeholderTextColor="#8E8E93"
              value={itemTitle}
              onChangeText={setItemTitle}
              autoFocus
            />

            <Text style={{ color: '#8E8E93', marginBottom: 8, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>Estimated Time (Minutes) [Optional]</Text>
            <TextInput
              style={{ backgroundColor: '#2C2C2E', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 24 }}
              placeholder="e.g., 480"
              placeholderTextColor="#8E8E93"
              value={itemEstimatedMinutes}
              onChangeText={setItemEstimatedMinutes}
              keyboardType="numeric"
            />

            <Pressable
              onPress={handleCreateItem}
              style={{ backgroundColor: '#AF52DE', padding: 16, borderRadius: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Add Item</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

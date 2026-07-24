import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { CollectionCategory } from '../store/collectionStore';

export function CategoryVectorIcon({ category, size = 20, color = '#BF5AF2' }: { category: CollectionCategory; size?: number; color?: string }) {
  switch (category) {
    case 'books':
      return <FontAwesome5 name="book-open" size={size} color={color} />;
    case 'games':
      return <Ionicons name="game-controller" size={size + 2} color={color} />;
    case 'fitness':
      return <FontAwesome5 name="dumbbell" size={size - 2} color={color} />;
    case 'stocks':
      return <Ionicons name="trending-up" size={size + 2} color={color} />;
    case 'courses':
      return <FontAwesome5 name="graduation-cap" size={size - 2} color={color} />;
    case 'travel':
      return <Ionicons name="airplane" size={size + 2} color={color} />;
    case 'other':
    default:
      return <Ionicons name="star" size={size} color={color} />;
  }
}

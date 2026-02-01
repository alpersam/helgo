import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, FlatList } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Itinerary, Place } from '../types';
import { PlaceCard } from './PlaceCard';
import { PlaceDetailSheet } from './PlaceDetailSheet';
import { colors, spacing } from './theme';

interface PlaceCarouselProps {
  itineraries: Itinerary[];
  onRequestSimilar?: (place: Place) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 280;
const CARD_SPACING = spacing.md;
const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Itinerary>);

export const PlaceCarousel: React.FC<PlaceCarouselProps> = ({ itineraries, onRequestSimilar }) => {
  const scrollX = useSharedValue(0);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleCardPress = (itinerary: Itinerary) => {
    setSelectedItinerary(itinerary);
    setSheetVisible(true);
  };

  const handleCloseSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSelectedItinerary(null), 380);
  };

  const handleRequestSimilar = (place: Place) => {
    setSheetVisible(false);
    setTimeout(() => setSelectedItinerary(null), 380);
    onRequestSimilar?.(place);
  };

  const renderItem = ({ item, index }: { item: Itinerary; index: number }) => {
    return (
      <CarouselItem
        itinerary={item}
        index={index}
        scrollX={scrollX}
        onPress={() => handleCardPress(item)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <AnimatedFlatList
        data={itineraries}
        renderItem={renderItem}
        keyExtractor={(item) => item.anchor.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      />

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {itineraries.map((_, index) => (
          <PaginationDot key={index} index={index} scrollX={scrollX} />
        ))}
      </View>

      {/* Detail sheet */}
      <PlaceDetailSheet
        itinerary={selectedItinerary}
        visible={sheetVisible}
        onClose={handleCloseSheet}
        onRequestSimilar={handleRequestSimilar}
      />
    </View>
  );
};

interface CarouselItemProps {
  itinerary: Itinerary;
  index: number;
  scrollX: SharedValue<number>;
  onPress: () => void;
}

const CarouselItem: React.FC<CarouselItemProps> = ({
  itinerary,
  index,
  scrollX,
  onPress,
}) => {
  const inputRange = [
    (index - 1) * SNAP_INTERVAL,
    index * SNAP_INTERVAL,
    (index + 1) * SNAP_INTERVAL,
  ];

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.7, 1, 0.7],
      Extrapolation.CLAMP
    );
    const rotateY = interpolate(
      scrollX.value,
      inputRange,
      [8, 0, -8],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { scale },
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <PlaceCard
        itinerary={itinerary}
        index={index}
        onPress={onPress}
      />
    </Animated.View>
  );
};

interface PaginationDotProps {
  index: number;
  scrollX: SharedValue<number>;
}

const PaginationDot: React.FC<PaginationDotProps> = ({ index, scrollX }) => {
  const inputRange = [
    (index - 1) * SNAP_INTERVAL,
    index * SNAP_INTERVAL,
    (index + 1) * SNAP_INTERVAL,
  ];

  const animatedStyle = useAnimatedStyle(() => {
    const width = interpolate(
      scrollX.value,
      inputRange,
      [8, 24, 8],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );

    return {
      width,
      opacity,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

const styles = StyleSheet.create({
  container: {
    marginLeft: -spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
  },
  cardWrapper: {
    marginHorizontal: CARD_SPACING / 2,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.tertiary,
  },
});

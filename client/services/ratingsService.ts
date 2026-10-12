import { database } from "@/config/firebase";
import { ref, get, onValue, runTransaction, Unsubscribe } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_RATINGS_KEY = "user_poi_ratings_v1";

interface UserRatings {
  [poiId: string]: number;
}

interface RatingData {
  totalScore: number;
  count: number;
}

export interface RatingResult {
  average: number;
  count: number;
  userRating: number;
}

export const getUserRatings = async (): Promise<UserRatings> => {
  try {
    const data = await AsyncStorage.getItem(USER_RATINGS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error getting user ratings:", error);
    return {};
  }
};

const saveUserRating = async (poiId: string, rating: number): Promise<void> => {
  try {
    const userRatings = await getUserRatings();
    userRatings[poiId] = rating;
    await AsyncStorage.setItem(USER_RATINGS_KEY, JSON.stringify(userRatings));
  } catch (error) {
    console.error("Error saving user rating:", error);
  }
};

const calculateAverage = (data: RatingData | null): number => {
  if (!data || data.count === 0) return 0;
  return data.totalScore / data.count;
};

export const getPoiRating = async (poiId: string): Promise<RatingResult> => {
  try {
    const ratingRef = ref(database, `ratings/${poiId}`);
    const snapshot = await get(ratingRef);
    const userRatings = await getUserRatings();

    if (snapshot.exists()) {
      const data = snapshot.val() as RatingData;
      return {
        average: calculateAverage(data),
        count: data.count,
        userRating: userRatings[poiId] || 0,
      };
    }

    return {
      average: 0,
      count: 0,
      userRating: userRatings[poiId] || 0,
    };
  } catch (error) {
    console.error("Error getting POI rating:", error);
    const userRatings = await getUserRatings();
    return { average: 0, count: 0, userRating: userRatings[poiId] || 0 };
  }
};

export const submitRating = async (
  poiId: string,
  rating: number
): Promise<RatingResult> => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { average: 0, count: 0, userRating: 0 };
  }
  if (!poiId || typeof poiId !== "string" || poiId.length > 100 || /[.#$\[\]]/.test(poiId)) {
    return { average: 0, count: 0, userRating: 0 };
  }
  const userRatings = await getUserRatings();
  const previousRating = userRatings[poiId];
  const ratingRef = ref(database, `ratings/${poiId}`);

  try {
    await runTransaction(ratingRef, (currentData: RatingData | null) => {
      if (currentData === null) {
        return {
          totalScore: rating,
          count: 1,
        };
      }

      if (previousRating) {
        return {
          totalScore: currentData.totalScore - previousRating + rating,
          count: currentData.count,
        };
      } else {
        return {
          totalScore: currentData.totalScore + rating,
          count: currentData.count + 1,
        };
      }
    });

    await saveUserRating(poiId, rating);
    return await getPoiRating(poiId);
  } catch (error) {
    console.warn("Firebase rating sync failed, using local-only mode:", error);
    await saveUserRating(poiId, rating);
    return {
      average: rating,
      count: 1,
      userRating: rating,
    };
  }
};

export const subscribeToRating = (
  poiId: string,
  callback: (data: RatingResult) => void
): Unsubscribe => {
  const ratingRef = ref(database, `ratings/${poiId}`);
  let lastKnownUserRating = 0;

  getUserRatings().then((ratings) => {
    lastKnownUserRating = ratings[poiId] || 0;
    callback({
      average: lastKnownUserRating > 0 ? lastKnownUserRating : 0,
      count: lastKnownUserRating > 0 ? 1 : 0,
      userRating: lastKnownUserRating,
    });
  });

  const unsubscribe = onValue(
    ratingRef,
    async (snapshot) => {
      const userRatings = await getUserRatings();
      lastKnownUserRating = userRatings[poiId] || 0;

      if (snapshot.exists()) {
        const data = snapshot.val() as RatingData;
        callback({
          average: calculateAverage(data),
          count: data.count,
          userRating: lastKnownUserRating,
        });
      } else {
        callback({
          average: lastKnownUserRating > 0 ? lastKnownUserRating : 0,
          count: lastKnownUserRating > 0 ? 1 : 0,
          userRating: lastKnownUserRating,
        });
      }
    },
    (error) => {
      console.warn("Firebase rating subscription failed, using local ratings:", error);
      callback({
        average: lastKnownUserRating > 0 ? lastKnownUserRating : 0,
        count: lastKnownUserRating > 0 ? 1 : 0,
        userRating: lastKnownUserRating,
      });
    }
  );

  return unsubscribe;
};

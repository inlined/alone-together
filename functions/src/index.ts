import * as functions from 'firebase-functions';
import * as Twitter from 'twitter';
import * as _ from 'lodash';

// The twitter config value is expected to hold consumer_key, consumer_secret, access_token_key, and
// access_token_secret. Technically we should either fetch application credentials or use a unique credential per user,
// but this doesn't really add value to the demo.
const twitter = new Twitter(functions.config().twitter);

async function getFriends(user: string): Promise<string[]> {
  // Note: More code is needed to support users following more than 5K people.
  const response = await twitter.get('friends/ids', {screen_name: user, stringify_ids: true});
  return response.ids;
}

async function getMyFollowerCount(user: string): Promise<number> {
  const responses = await twitter.get('users/lookup', {screen_name: user} );
  return responses[0].followers_count;
}

async function getFollowerCount(ids: string[]) {
  const responses = await twitter.get('users/lookup', {user_id: ids.join(',')});
  // Responses is an array of user profiles; we only care about the followers count
  return responses.map(response => response.followers_count);
}

/* Batch limit for Twitter's GetFollowerCount API. Made a non-documented (@internal) export for testing.
 * @internal */
export let USER_LOOKUP_BATCH_SIZE = 100;

export let rating = functions.https.onRequest(async (req, res) => {
  try {
    const username = req.query.username;

    // 0. Get my follower count:
    const followerCount = await getMyFollowerCount(username);

    // 1. Get the list of people this user follows:
    const friendIds = await getFriends(username);

    // 2. Break this into groups no larger than Twitter's maximum batch size:
    const friendIdsBatches = _.chunk(friendIds, USER_LOOKUP_BATCH_SIZE);

    // 3. Get the follower count for each batch in parallel.
    const getFriendsFollowersInBackground = friendIdsBatches.map(batch => getFollowerCount(batch));

    // 4. Wait for all batches to be returned.
    const friendFollowersBatchResult = await Promise.all(getFriendsFollowersInBackground);

    // 5. In steps 2-4 we have an array of arrays. Turn that back into a single array of counts.
    const friendsFollowersCount = _.flatMap(friendFollowersBatchResult);

    // 6. Calculate fun/depressing stats:
    const friendCount = friendIds.length;
    const meanFriendsFollowers = _.mean(friendsFollowersCount);
    const morePopularFriends = _.countBy(friendsFollowersCount, theirFollowers => theirFollowers > followerCount).true;
    const morePopularFriendsPercent = morePopularFriends / friendCount;

    const result = {username, friendCount, followerCount, meanFriendsFollowers, morePopularFriends, morePopularFriendsPercent};
    res.json(result);

  } catch (err) {
    console.error('Failed to calculate friendship stats:', err);
    res.status(504).json(err);
  }
});

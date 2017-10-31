import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Twitter from 'twitter';
import * as _ from 'lodash';
import * as helper from './demo-helper';

admin.initializeApp(functions.config().firebase);

async function getFriends(twitter: Twitter, user: string): Promise<string[]> {
  // Note: More code is needed to support users following more than 5K people.
  const response = await twitter.get('friends/ids', {screen_name: user, stringify_ids: true});
  return response.ids;
}

async function lookupUser(twitter: Twitter, user: string): Promise<Twitter.UserLookupResult> {
  const responses = await twitter.get('users/lookup', {screen_name: user} );
  return responses[0];
}

async function getFollowerCount(twitter: Twitter, ids: string[]) {
  const responses = await twitter.get('users/lookup', {user_id: ids.join(',')});
  // Responses is an array of user profiles; we only care about the followers count
  return responses.map(response => response.followers_count);
}

/* Batch limit for Twitter's GetFollowerCount API. Made a non-documented (@internal) export for testing.
 * @internal */
export let USER_LOOKUP_BATCH_SIZE = 100;

export const rating = functions.https.onRequest(async (req, res) => {
  try {
    const username = req.query.username;
    const twitter = helper.authenticateTwitter(req);

    // 0. Get my follower count:
    const me = await lookupUser(twitter, username);


    // 1. Get the list of people this user follows:
    const myFriendsIds = await getFriends(twitter, username);

    // 2. Break this into groups no larger than Twitter's maximum batch size:
    const batches = _.chunk(myFriendsIds, USER_LOOKUP_BATCH_SIZE);

    // 3. Get the follower count for each batch in parallel.
    const getFriendsFame = batches.map(batch => getFollowerCount(twitter, batch));

    // 4. Wait for all batches to be returned.
    const friendsFameBatches = await Promise.all(getFriendsFame);

    // 5. In steps 2-4 we have an array of arrays. Turn that back into a single array of counts. Sort for later stats.
    const friendsFame = _.flatMap(friendsFameBatches).sort();

    // 6. Calculate fun/depressing stats:
    const friendCount = myFriendsIds.length;
    const fame = me.followers_count;
    const friendFameAvg = _.mean(friendsFame);
    const friendsFameP50 = friendsFame[(friendsFame.length / 2).toFixed()];
    const friendsFameP90 = friendsFame[(friendsFame.length / 10).toFixed()];
    const moreFamousFriendCount = _.countBy(friendsFame, theirFame => theirFame > fame).true;
    const moreFamousFriendRatio = moreFamousFriendCount / friendCount;

    const stats = {username, fame, friendCount, friendFameAvg, friendsFameP50, friendsFameP90, moreFamousFriendCount, moreFamousFriendRatio};
    console.log('Full stats: ', JSON.stringify(stats, null, 2));

    await admin.database().ref(`stats/${username}`).set(stats);
    res.json({username, moreFamousFriendRatio});
  } catch (err) {
    console.error('Failed to calculate friendship stats:', err);
    res.status(504).json(err);
  }
});

export const aggregate = functions.database.ref('stats/{username}').onCreate(async event => {
  const moreFamousThanFriends = event.data.val().moreFamousFriendRatio < 0.5;

  await admin.database().ref('aggregate').transaction(val => {
    const res = val || {moreFamousThanPeers: 0, lessFamousThanPeers: 0, total: 0, ratioMoreFamousThanPeers: 0};
    console.log('Prior to update, stats are: ' + JSON.stringify(res, null, 2));
    if (moreFamousThanFriends) {
      res.moreFamousThanPeers += 1;
    } else {
      res.lessFamousThanPeers += 1;
    }
    res.total += 1;
    res.ratioMoreFamousThanPeers = res.moreFamousThanPeers / res.total;
    console.log('Updating stats to: ' + JSON.stringify(res, null, 2));
    return res;
  });
});

export * from './demo-helper';

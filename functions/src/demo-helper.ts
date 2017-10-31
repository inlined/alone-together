import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Twitter from 'twitter';
import {Request} from 'express';

export const resetAggregate = functions.database.ref('aggregate').onDelete(async event => {
    const stat = {
        lessFamousThanPeers: 0,
        moreFamousThanPeers: 0,
        ratioMoreFamousThanPeers: 0,
        total: 0,
    };
    const snapshot = await admin.database().ref('stats').once('value');
    snapshot.forEach(childSnapshot => {
        const val = childSnapshot.val();
        const moreFamousThanFriends = val.moreFamousFriendRatio < 0.5;
        if (moreFamousThanFriends) {
            stat.moreFamousThanPeers += 1;
        } else {
            stat.lessFamousThanPeers += 1;   
        }
        stat.total += 1;
        return false;
    });
    stat.ratioMoreFamousThanPeers = stat.moreFamousThanPeers / stat.total;
    await admin.database().ref('aggregate').set(stat);
});

export function authenticateTwitter(req: Request) {
  // The twitter config value is expected to hold consumer_key, consumer_secret, access_token_key, and
  // access_token_secret. To help the demo along, we allow a fallback to use hard-coded credentials
  // from firebase config when the request has no authentication header.
  const config = functions.config().twitter;

  const auth = req.headers.authentication as string;
  if (auth && auth.startsWith('Basic ')) {
    console.log('Using request-based authentication');
    const encoded = auth.slice('Basic '.length);
    [config.access_token_key, config.access_token_secret] =
      encoded.split('+').map(part => Buffer.from(part, 'base64').toString());
  }

  return new Twitter(config);
}

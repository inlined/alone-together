import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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
        const moreFamousThanFriends = val.moreFamousFriendRatio > 0.5;
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

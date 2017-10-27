// Adds (very partial) TypeScript definitions for the Twitterer API.
// I didn't like the existing TypeScript library, partially because it doesn't correctly declare twitter as a module.
// The Twitterter SDK is very loosely typed, so a proper TypeScript API needs to dramatically overcompensate to help guide
// proper code. This work is fairly intricate, so I've only demonstrated how it can be built for the two APIs used in
// this demo.

import * as http from 'http';

/* tslint:disable:no-namespace */
declare namespace Twitter {
  type InitializationOptions = BasicInitializationOptions & (UserInitializationOptions | AppOnlyInitializationOptions);

  interface BasicInitializationOptions {
    consumer_key: string,
    consumer_secret: string,
  }

  interface UserInitializationOptions {
    access_token_key: string
    access_token_secret: string
  }

  interface AppOnlyInitializationOptions {
    bearer_token: true,
  }

// ROUTES:
  type FriendsIdsRoute = 'friends/ids';
  type UsersLookupRoute = 'users/lookup';

// REQUEST OPTIONS:
  interface ScreenNameOption {
    screen_name: string
  }

  interface UserIdOption {
    user_id: string
  }

  type FriendsIdsOptions = {
    stringify_ids: boolean,
  } & (ScreenNameOption | UserIdOption);
// Note: because UserLookupOptions supports the lookup of multiple users, it conforms to both UserIdOptions AND
// ScreenNameOption unlike FriendsIdOptions which supports only one.
  interface UsersLookupOptions extends UserIdOption, ScreenNameOption {
    include_entities: false
  }


// RESPONSES:
  interface FriendsIdsResult {
    ids: string[],
    next_cursor: number,
    next_cursor_str: string,
    previous_cursor: number,
    previous_cursor_str: string,
  }

  interface UserLookupResult {
    name: string,
    followers_count: number,
    friends_count: number,
  }
}

// APIS:
declare class Twitter {
  constructor (options: Twitter.InitializationOptions);

  get(FriendsIdsRoute, FriendsIdsOptions): Promise<Twitter.FriendsIdsResult>
  get(FriendsIdsRoute, FriendsIdsOptions, callback: (err: Error, data: Twitter.FriendsIdsResult, res: http.IncomingMessage) => void)
  get(UsersLookupRoute, UsersLookupOptions): Promise<Twitter.UserLookupResult[]>
  get(UsersLookupRoute, UsersLookupOptions, callback: (err: Error, data: Twitter.UserLookupResult[], res: http.IncomingMessage) => void)
}

export = Twitter;
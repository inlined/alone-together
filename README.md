# Alone Together
Demo of the [friendship paradox](https://en.wikipedia.org/wiki/Friendship_paradox) via Twitter social network. The friendship paradox states "most people have fewer friends than their friends do." This is true for most social graphs because popular people will push more people below the average.

# Instructions

## Prerequisites

1. A Firebase account *with billing enabled*. Billing must be enabled to call third party APIs like twitter.com.
2. The latest copy of the `firebase-tools`.
3. A Twitter app. You can create one at [apps.twitter.com](https://apps.twitter.com).

## Setup

1. Clone this repo.
2. Set `firebase-tools` to use your project with `firebase use <YOUR_PROJECT>`
3. Use `firebase functions:config:set` to set `twitter.consumer_secret`, `twitter.consumer_key`, `twitter.access_token_secret`, and `twitter.access_token_key`. You can get these values from [apps.twitter.com](https://apps.twitter.com)
4. Deploy with `firebase deploy`

## Usage

1. `firebase deploy` will print out the URL of your http function (it will end with "/rating")
2. Go to this URL. It expects the query parameter "?username=<TWITTER USERNAME>"

## Testing locally

1. Make a local copy of your runtime config by running the following command from your `functions` directory:
   `firebase functions:config:get > .runtimeconfig.json`
   (We highly recommend you include this file in your `.gitignore`)
2. Start the functions shell with `firebase experimental:functions:shell` or create a local HTTP server for the `rating` function with `firebase serve --only functions`

# Corners cut

This is just a tech demo so a number of corners were cut to save time or make code more readable:

1. This program will only analyze a user's first 5000 followers. Support for more followers requires pagination support in the getFollowers helper method.
2. This program hard codes all API calls to be made against a single user. A better option would be to use application-level credentials. This requires a manual OAuth call with the `twitter` node module. It comes automatically in the `twit` node module, but this SDK has a much more verbose return type and makes the rest of the code less readable. The best option would be to accept Twitter OAuth tokens in the `rating` function's Authentication header and use that for Twitter API calls.

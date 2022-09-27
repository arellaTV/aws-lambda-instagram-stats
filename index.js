const instaTouch = require('instatouch');

const escapeEmoji = (text) => {
  return text.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '');
}

exports.handler = async (event) => {
  const notFoundResponse = {
    statusCode: 404,
    body: JSON.stringify('Not found.'),
  };
  try {
    const url = event.queryStringParameters.url;

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify('Bad request.'),
      };
    }

    const options = { session: process.env.SESSION_ID }
    const postMeta = await instaTouch.getPostMeta(url, options)
    const postDetails = postMeta.items[0];

    if (!postDetails.items) {
      return notFoundResponse;
    }

    const data = {};
    data.title = escapeEmoji(postDetails.caption.text);

    if (postDetails.carousel_media) {
      data.thumbnailSrc = postDetails.carousel_media[0].image_versions2?.candidates[0]?.url
    }

    if (postDetails.image_versions2) {
      data.thumbnailSrc = postDetails.image_versions2?.candidates[0]?.url
    }

    data.duration = postDetails.video_duration;
    data.views = postDetails.play_count || postDetails.view_count;
    data.postId = postDetails.pk;
    data.likes = postDetails.like_count;
    data.comments = postDetails.comment_count;
    data.publishDate = (new Date(postDetails.caption.created_at * 1000)).toISOString();
    data.channel = postDetails.caption.user.username
    data.postType = postDetails.product_type
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 400,
      body: JSON.stringify('An error occurred.'),
    };
  }
};

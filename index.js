const axios = require('axios');
const chromium = require('@sparticuz/chrome-aws-lambda');

const escapeEmoji = (text) => {
  return text.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '');
}

async function getInfoByMediaId(mediaId) {
  const response = await axios.get(`https://i.instagram.com/api/v1/media/${mediaId}/info/`, {
    headers: {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "sec-gpc": "1",
      "x-asbd-id": process.env.ASBD_ID,
      "x-csrftoken": process.env.CSRF_TOKEN,
      "x-ig-app-id": process.env.IG_APP_ID,
      "x-ig-www-claim": process.env.IG_WWW_CLAIM,
      "x-instagram-ajax": process.env.IG_AJAX,
      "cookie": process.env.COOKIE,
      "Referer": "https://www.instagram.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    },
  });

  return response;
}

exports.handler = async (event) => {
  let browser = null;
  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage()
    const url = event.queryStringParameters.url;
    await page.goto(`view-source:${url}`);
    const content = await page.content();
    const part1 = content.split('instagram://media?id=')[1];
    const mediaId = part1.split('</span>')[0];
  
    if (!mediaId) {
      return {
        statusCode: 400,
        body: JSON.stringify('Bad request.'),
      };
    }
  
    const { data: postMeta } = await getInfoByMediaId(mediaId)
    const postDetails = postMeta.items[0];

    if (!postDetails) {
      return {
        statusCode: 404,
        body: JSON.stringify('Not found.'),
      };
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
    data.views = postDetails.view_count;
    data.postId = postDetails.pk;
    data.likes = postDetails.like_count;
    data.comments = postDetails.comment_count;
    data.publishDate = (new Date(postDetails.caption.created_at * 1000)).toISOString();
    data.channel = postDetails.caption.user.username
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify('An error occurred.'),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

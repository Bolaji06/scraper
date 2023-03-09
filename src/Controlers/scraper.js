const needle = require('needle');
const scraper = require('cheerio');
const validUrl = require('valid-url');

function checkInputContent(url, objectClass) {
	if (!url || !objectClass) {
		throw new Error('Invalid input');
	}
}

async function fetchUrl(url) {
	const response = await needle(url);
	return response.body;
}

function scrapeData(bodyHtml, objectClass) {
	const articles = [];
	const scraperLoad = scraper.load(bodyHtml);
	scraperLoad(objectClass, bodyHtml).each(function () {
		const title = scraperLoad(this).text();
		const link = scraperLoad(this).find('a').attr('href');
		articles.push({
			title,
			link,
		});
	});
	return articles;
}

function filterArticles(articles, filterFn) {
	return articles.filter(filterFn);
}

function withKeyword(keyWord) {
	return function (article) {
		const convertToLowerCase = article.title.toLowerCase();
		return convertToLowerCase.includes(keyWord);
	};
}

function noKeyword() {
	return function () {
		return true;
	};
}

module.exports = async function Scrapper(req, res) {
	const url = req.body.url;
	const objectClass = req.body.objectClass;
	const keyWord = req.body.keyWord;

	try {
		checkInputContent(url, objectClass);
	} catch (error) {
		console.error(error);
		res.status(400).json({ message: 'Invalid input' });
		return;
	}

	if (!validUrl.isHttpsUri(url)) {
		res.status(400).json({ message: 'Bad request' });
		return;
	}

	try {
		const bodyHtml = await fetchUrl(url);
		const articles = scrapeData(bodyHtml, objectClass);

		const filterFn = keyWord ? withKeyword(keyWord) : noKeyword();
		const filteredArticles = filterArticles(articles, filterFn);

		res.status(200).json({
			state: 'succes',
			'objects found': filteredArticles.length,
			'key-word': keyWord,
			'scanned webpage': url,
			'found articles': filteredArticles,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

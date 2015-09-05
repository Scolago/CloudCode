var _ = require("underscore"); // External library, used in searching the database
var moment = require('moment'); // External library, used for date and time variables


// Job that will flush articles, files and events.
Parse.Cloud.job("flush", function(request, status) {
  Parse.initialize('App-ID', 'JS-Key'); // Is needed. Make sure the id and key values are not submitted to github.
	flushFiles() && flushArticles().then(function() {
		status.success("Flushed Files and Articles successfully!");
	}, function(error) {
    status.error(error.message);
  });
});

// Job that will fetch the Articles and files
Parse.Cloud.job("ArticleFileFeed", function(request, status) {
	var promise = Parse.Promise.as();
	promise = promise.then(function() {
		return getArticles();
	});

	promise = promise.then(function() {
		return getFiles();
	});

	Parse.Promise.when(promise).then(function() {
		status.success("Articles and Files saved");
	}, function(error) {
		status.error(error.message);
	});

});

// The fucntion to get the articles
function getArticles() {
	var promise = new Parse.Promise();
	var Articles = Parse.Object.extend("Articles");

	Parse.Cloud.httpRequest({
		method: "GET",
		url: 'http://www.scolago.com/001/articles/views/articles',
		success: function(httpResponse) {
			var data = JSON.parse(httpResponse.text);
			var articles = new Array();
			for (var i = 0; i < data.length; i++) {
				var Articles = Parse.Object.extend("Articles"),
					article = new Articles(),
					content = data[i];
					
				article.set("body", content.body.und[0].value);
				article.set("vid", content.vid);
				article.set("title", content.title);

				var epochTime = content.created;
				var dateObject = parseInt(moment.unix(content.created).format());
				var dateString = moment.unix(epochTime).format("MMMM D, YYYY, hh:mm");
				article.set("dateString", dateString);
				article.set("dateCreated", epochTime);

				console.log(content.event_calendar_date.und[0].value);
				articles.push(article);
			};


			// function save(articles);
			Parse.Object.saveAll(articles, {
				success: function(objs) {
					promise.resolve();
				},
				error: function(error) {
					console.log(error);
					promise.reject(error.message);
				}
			});

		},
		error: function(error) {
			console.log(error);
			promise.reject(error.message);
		}
	});

	return promise;

}

// Function to get the Files
function getFiles() {

	var promise = new Parse.Promise();
	var Files = Parse.Object.extend("Files");

	Parse.Cloud.httpRequest({
		method: "GET",
		url: 'http://www.scolago.com/001/articles/views/files',
		success: function(httpResponse) {

			var data = JSON.parse(httpResponse.text);
			var files = new Array();

			for (var i = 0; i < data.length; i++) {

				var Files = Parse.Object.extend("Files"),
					file = new Files(),
					content = data[i];
				var filename = JSON.stringify(content.file_managed_filename)
				var filequotes = 'http://www.scolago.com/001/sites/default/files/' + filename;
				var filelink = filequotes.replace(/"/g, "");
				file.set("file_link", filelink);
				files.push(file);

			};


			// function saving();
			Parse.Object.saveAll(files, {
				success: function(objs) {
					promise.resolve();
				},
				error: function(error) {
					console.log(error);
					promise.reject(error.message);
				}
			});

		},
		error: function(error) {
			console.log(error);
			promise.reject(error.message);
		}
	});

	// });

	return promise;

}

// The function to delete the Articles stored in the database
function flushArticles() {

	//Clear previous records from the class.
	var Articles = Parse.Object.extend("Articles");
	var article = new Articles();
	var arr = [];
	var now = new Date;
	var query = new Parse.Query(Articles);
	return query.find().then(function(oldArticles) {
		_.each(oldArticles, function(oldArticles) {
			console.log("Deleting Articles " + oldArticles.get("ArticlesId"));
			arr.push(oldArticles.destroy());
		});
		return Parse.Promise.when(arr);
	});
}

// The function to delete the files stored in the database
function flushFiles() {

	//Clear expired previous records from the class.
	var Files = Parse.Object.extend("Files");
	var file = new Files();
	var arr = [];
	var now = new Date;
	var query = new Parse.Query(Files);
	return query.find().then(function(oldFiles) {
		_.each(oldFiles, function(oldFiles) {
			console.log("Deleting Files " + oldFiles.get("FilesId"));
			arr.push(oldFiles.destroy());
		});
		return Parse.Promise.when(arr);
	});
}


// Search the database for duplicate Articles and remove them
Parse.Cloud.job("removeDuplicateArticles", function(request, status) {

	var _ = require("underscore");
	var Articles = Parse.Object.extend("Articles");
	var article = new Articles();
	var hashTable = {};

	function hashKeyForArticles(Articles) {
		var fields = ["title", "body"];
		var hashKey = "";
		_.each(fields, function(field) {
			hashKey += Articles.get(field) + "/";
		});
		return hashKey;
	}

	var articlesQuery = new Parse.Query("Articles");
	articlesQuery.each(function(Articles) {
		var key = hashKeyForArticles(Articles);

		if (key in hashTable) { // this item was seen before, so destroy this
			return Articles.destroy();
		}
		else { // it is not in the hashTable, so keep it
			hashTable[key] = 1;
		}

	}).then(function() {
		status.success("Duplicate articles removed");
	}, function(error) {
		status.error(error.message);
	});
});


// Search the database for duplicate Articles and remove them
Parse.Cloud.job("removeDuplicateFiles", function(request, status) {

	var _ = require("underscore");
	var Files = Parse.Object.extend("Files");
	var file = new Files();
	var hashTable = {};

	function hashKeyForFiles(Files) {
		var fields = ["file_link"];
		var hashKey = "";
		_.each(fields, function(field) {
			hashKey += Files.get(field) + "/";
		});
		return hashKey;
	}

	var filesQuery = new Parse.Query("Files");
	filesQuery.each(function(Files) {
		var key = hashKeyForFiles(Files);
		if (key in hashTable) { // this item was seen before, so destroy this
			return Files.destroy();
		}
		else { // it is not in the hashTable, so keep it
			hashTable[key] = 1;
		}

	}).then(function() {
		status.success("Duplicate files removed.");
	}, function(error) {
		status.error(error.message);
	});
});



// Figure out if this function can be implemented where needed for DRY principle
// function saving(type) {
// 	Parse.Object.saveAll(type, {
// 		success: function(objs) {
// 			promise.resolve();
// 		},
// 		error: function(error) {
// 			console.log(error);
// 			promise.reject(error.message);
// 		}
// 	});
// }

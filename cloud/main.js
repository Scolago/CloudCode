var _ = require("underscore");
var moment = require('moment');

Parse.initialize('AppID', 'JS-Key');

Parse.Cloud.job("flush", function(request, status) {
    flushFiles().then(function() {
        status.success("Flushed Files successfully!");
    });
    flushArticles().then(function() {
        status.success("Flushed Articles successfully!");
    });
});

Parse.Cloud.job("ArticleFeed", function(request, status) {


	// These are the Twitter users you want Tweets from, excluding the '@'
	var screenNames = [
		"uknj"
	];

	var promise = Parse.Promise.as();

	_.each(screenNames, function(){

		promise = promise.then(function(){

			return getArticles();

		});

	});

	Parse.Promise.when(promise).then(function(){

		status.success("Articles saved");

	}, function(error){

		status.error(error.message);

	});

});

function getArticles(){

	var promise = new Parse.Promise();

	var Articles = Parse.Object.extend("Articles");


		// var ts = Math.floor(new Date().getTime() / 1000);
		// var timestamp = ts.toString();


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

            articles.push(article);

				};

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

	// });

	return promise;

}


function flushArticles() {

  //Clear expired previous records from the class.
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

Parse.Cloud.job("removeDuplicateArticles", function(request, status) {

  var _ = require("underscore");
  var Articles = Parse.Object.extend("Articles");
  var article = new Articles();

  var hashTable = {};

  function hashKeyForArticles(Articles) {
    var fields = ["title", "body"];
    var hashKey = "";
    _.each(fields, function (field) {
        hashKey += Articles.get(field) + "/" ;
    });
    return hashKey;
  }

  var articlesQuery = new Parse.Query("Articles");
  articlesQuery.each(function (Articles) {
    var key = hashKeyForArticles(Articles);

    if (key in hashTable) { // this item was seen before, so destroy this
        return Articles.destroy();
    } else { // it is not in the hashTable, so keep it
        hashTable[key] = 1;
    }

  }).then(function() {
    status.success("Duplicate articles removed");
  }, function(error) {
    status.error(error.message);
  });
});

function getFiles(){

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
            var filequotes = 'http://www.scolago.com/001/sites/default/files/'+ filename;
            var filelink = filequotes.replace(/"/g,"");

            file.set("file_link", filelink);

            files.push(file);

				};

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

Parse.Cloud.job("FilesList", function(request, status) {


	// These are the Twitter users you want Tweets from, excluding the '@'
	var screenNames = [
		"nannerb",
		"parseit"
	];

	var promise = Parse.Promise.as();

	_.each(screenNames, function(){

		promise = promise.then(function(){

			return getFiles();

		});

	});

	Parse.Promise.when(promise).then(function(){

		status.success("Files saved");

	}, function(error){

		status.error(error.message);

	});

});

Parse.Cloud.job("removeDuplicateFiles", function(request, status) {

  var _ = require("underscore");
  var Files = Parse.Object.extend("Files");
  var file = new Files();

  var hashTable = {};

  function hashKeyForFiles(Files) {
    var fields = ["file_link"];
    var hashKey = "";
    _.each(fields, function (field) {
        hashKey += Files.get(field) + "/" ;
    });
    return hashKey;
  }

  var filesQuery = new Parse.Query("Files");
  filesQuery.each(function (Files) {
    var key = hashKeyForFiles(Files);

    if (key in hashTable) { // this item was seen before, so destroy this
        return Files.destroy();
    } else { // it is not in the hashTable, so keep it
        hashTable[key] = 1;
    }

  }).then(function() {
    status.success("Duplicate files removed.");
  }, function(error) {
    status.error(error.message);
  });
});

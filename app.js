var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const passport = require('passport')
var mongoose = require('mongoose')
const bodyParser = require('body-parser')
const session = require('express-session');
const nodemailer = require('nodemailer');
const multer = require('multer');
const multerS3 = require('multer-s3')
require('dotenv').config()
var AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-northeast-1' });
var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const local = process.env.LOCAL;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.json({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

/////////////////////////// セッション管理
app.use(session({
	secret: "secret key",
	resave: false,
	saveUninitialized: true
}));

///////////////////////mongodb接続(user)
const options = {
	useUnifiedTopology: true,
	useNewUrlParser: true
}
mongoose.connect('mongodb://3.115.71.28/truckmarket', options);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'DB connection error:'));
db.once('open', () => console.log('DB connection successful!!!!'));

var Schema = mongoose.Schema;
var UserSchema = new Schema({
	onetimepass: String,
	id: String,
	name: String,
	email: String,
	password: String,
	followlist: [],
	likelist: [],
});
var UserModel = mongoose.model('users', UserSchema);
var User = mongoose.model('users');

///////////////////////mongodb接続(creator)
var Schema = mongoose.Schema;
var CreatorSchema = new Schema({
	onetimepass: String,
	id: String,
	name: String,
	email: String,
	password: String,
	bio: String,
	topimg: String,
	backimg: String,
	trucks: [],
	followlist: [],
	likelist: [],
	followerlist: [],
});
var CreatorModel = mongoose.model('creators', CreatorSchema);
var Creator = mongoose.model('creators');

///////////////////////mongodb接続(truck)検索用
var Schema = mongoose.Schema;
var TruckSchema = new Schema({
	truckid: String,
	id: String,
	title: String,
	artist: String,
	image: String,
	m4a: String,
	category: String,
	played: Number,
	liked: Number,
});
var TruckModel = mongoose.model('trucks', TruckSchema);
var Truck = mongoose.model('trucks');



/////////////////検索
app.post('/search', (req, res) => {
	console.log(req.body.param);
	if (req.body.param.indexOf(' ') > -1) {
		var paramslist = req.body.param.split(' ')
	} else if (!req.body.param) {
		res.redirect('/')
	} else {
		var paramslist = [req.body.param]
	}
	if (!paramslist[1]) {
		paramslist.push('undefind')
		paramslist.push('undefind')
	}
	console.log(paramslist)
	var query = {
		$or: [
			{ title: { $regex: `${paramslist[0]}`, $options: 'i' } },
			{ artist: { $regex: `${paramslist[0]}`, $options: 'i' } },
			{ category: { $regex: `${paramslist[0]}`, $options: 'i' } },
			{ title: { $regex: `${paramslist[1]}`, $options: 'i' } },
			{ artist: { $regex: `${paramslist[1]}`, $options: 'i' } },
			{ category: { $regex: `${paramslist[1]}`, $options: 'i' } },
			{ title: { $regex: `${paramslist[2]}`, $options: 'i' } },
			{ artist: { $regex: `${paramslist[2]}`, $options: 'i' } },
			{ category: { $regex: `${paramslist[2]}`, $options: 'i' } },
		]
	};
	Truck.find(query, function (err, result) {
		if (err) {
			console.log(err)
			res.render('index')
		} else if (result != null) {
			console.log(result)
			res.render('search', { param: JSON.stringify(result), query: req.body.param, length: result.length })
		}
	})
});

/////////////////creatorページ振り分け
app.get('/artists/:id', (req, res) => {
	console.log(req.params.id)
});


/////////////////user登録
app.get('/register', (req, res) => {
	res.render('register', { info: '' });
});

app.post('/register', async (req, res) => {
	User.findOne({
		email: req.body.email,
	}, function (err, result) {
		console.log(result)
		if (err) {
			console.log(err)
		} else if (result != null) {
			res.render('register', { info: 'メールアドレスはすでに登録されています。' });
		} else {
			var min = 100000;
			var max = 999999;
			var Pass = Math.floor(Math.random() * (max + 1 - min)) + min;
			res.render('login', { info: '' });
			var user = new UserModel();
			user.onetimepass = Pass.toString();
			user.id = Date.now().toString();
			user.name = req.body.name;
			user.email = req.body.email;
			user.password = req.body.password;
			user.followlist = [];
			user.likelist = [];
			user.save(function (err) {
				if (err) { console.log(err); }
			});
		}
	})
});
/////////////////creator登録
app.get('/creatorregister', (req, res) => {
	res.render('creatorregister', { info: '' });
});

app.post('/creatorregister', async (req, res) => {
	Creator.findOne({
		name: req.body.name,
	}, function (err, result) {
		console.log(result)
		if (err) {
			console.log(err)
		} else if (result != null) {
			res.render('creatorregister', { info: 'アーティスト名はすでに登録されています。' });
		} else {
			var min = 100000;
			var max = 999999;
			var Pass = Math.floor(Math.random() * (max + 1 - min)) + min;
			res.render('creatorlogin', { info: '' });
			var creator = new CreatorModel();
			creator.onetimepass = Pass.toString();
			creator.id = (Pass / 2).toString() + Date.now().toString();
			creator.name = req.body.name;
			creator.email = req.body.email;
			creator.password = req.body.password;
			creator.trucks = [];
			creator.bio = '';
			creator.topimg = 'default-topimg-official.png';
			creator.backimg = 'default-backimg-official.png';
			creator.followlist = [];
			creator.likelist = [];
			creator.followerlist = [];
			creator.save(function (err) {
				if (err) { console.log(err); }
			});
		}
	})
});

///////////////mypageログイン
app.get('/mypage', (req, res) => {
	if (req.session.creator) {
		Creator.findOne({
			id: req.session.creator.id,
		}, function (err, result) {
			//console.log(result)
			if (err) {
				res.json(err)
			} else if (result != null) {
				console.log(result)
				res.render('mypage', {
					artistname: result.name,
					topimg: result.topimg,
					backimg: result.backimg,
					follower: result.followerlist.length
				})
			}
		})
	} else if (req.session.creator === undefined) {
	res.render('creatorlogin', { info: '' })
} else {
	res.render('creatorlogin', { info: '' })
}
});

app.post('/mypagelogin', async (req, res) => {
	Creator.findOne({
		email: req.body.email,
		password: req.body.password
	}, function (err, result) {
		//console.log(result)
		if (err) {
			console.log(err)
		} else if (result != null) {
			console.log(result.email)
			req.session.creator = {
				id: result.id,
				name: result.name,
				email: req.body.email,
			}
			res.redirect('mypage')
		} else {
			console.log(result + '(else)')
			res.render('mypagelogin', { info: '認証できません。' });
		}
	})
});

///////////////creatorログイン
app.get('/creatorlogin', (req, res) => {
	if (req.session.creator) {
		res.redirect('submit')
	} else if (req.session.creator === undefined) {
		res.render('creatorlogin', { info: '' })
	} else {
		res.render('creatorlogin', { info: '' })
	}
});

app.post('/creatorlogin', async (req, res) => {
	Creator.findOne({
		email: req.body.email,
		password: req.body.password
	}, function (err, result) {
		//console.log(result)
		if (err) {
			console.log(err)
		} else if (result != null) {
			console.log(result.email)
			req.session.creator = {
				id: result.id,
				name: result.name,
				email: req.body.email,
			}
			res.redirect('submit')
		} else {
			console.log(result + '(else)')
			res.render('creatorlogin', { info: '認証できません。' });
		}
	})
});

///////////////submit
app.get('/submit', (req, res) => {
	if (req.session.creator) {
		res.render('submit', { username: req.session.creator.name, trucklist: "trucklist" })
	} else if (req.session.creator === undefined) {
		res.render('creatorlogin', { info: '' })
	} else {
		res.render('creatorlogin', { info: '' })
	}
});

///////////////API
app.get('/trucklist', (req, res) => {
	Truck.find({
		id: req.session.creator.id,
	}, function (err, result) {
		if (err) {
			console.log(err)
			res.redirect('creatorlogin', { info: 'エラーが発生しました。' })
		} else if (result != null) {
			//var param = JSON.toString(result.trucks)
			console.log(result)
			res.header('Content-Type', 'application/json; charset=utf-8')
			res.json(result);
		}
	})
})

app.get('/trucklistall', (req, res) => {
	/* Truck.find({
		m4a: { $exists: true },
	}, function (err, result) {
		if (err) {
			console.log(err)
			res.render('creatorlogin', { info: 'エラーが発生しました。' })
		} else if (result != null) {
			var param = result
			res.header('Content-Type', 'application/json; charset=utf-8')
			res.json(param);
		}
	}) */
	var query = Truck.find({m4a: { $exists: true }}).limit(10)
    query.exec(function(err,result){
		if (err) {
			console.log(err)
			res.render('creatorlogin', { info: 'エラーが発生しました。' })
		} else if (result != null) {
			var param = result
			res.header('Content-Type', 'application/json; charset=utf-8')
			res.json(param);
		}
    });
})

app.post('/playcounter', (req, res) => {
	Truck.findOne({
		title: req.body.title,
		artist: req.body.artist
	}, function (err, result) {
		if (err) {
			console.log(err)
			res.render('creatorlogin', { info: 'エラーが発生しました。' })
		} else if (result != null) {
			var played = result.played + 1;
			console.log(played)
			TruckModel.updateOne({
				id: result.id,
				title: req.body.title
			}, { $set: { played: played } },
				function (err, result) {
					if (err) {
						res.json(err)
					} else if (result != null) {
						res.json(result)
						console.log('playcount+' + result)
					}
				})
		}
	})
})

app.post('/likelist', (req, res) => {
	if (req.session.creator) {
		Truck.findOne({
			title: req.body.title,
			artist: req.body.artist
		}, function (err, result) {
			if (err) {
				console.log(err)
				res.render('creatorlogin', { info: 'エラーが発生しました。' })
			} else if (result != null) {
				console.log(result)
				var liked = result.liked + 1;
				TruckModel.updateOne(
					{ truckid: result.truckid },
					{ $set: { liked: liked } },
					function (err, result) {
						if (err) {
							console.log(err)
						} else if (result != null) {
							console.log(result)
						}
					}
				)
				CreatorModel.updateOne(
					{ id: req.session.creator.id },
					{ $push: { likelist: result.truckid } },
					//{title: req.body.title, artist: req.session.creator.name, image: req.files[0].key, m4a: req.files[1].key }} }, 
					//{ upsert: false }, 
					function (err, result) {
						if (err) {
							console.log(err)
						} else if (result != null) {
							res.json(result)
						}
					}
				)
			}
		})
	} else {

	}
});

app.get('/likelist', (req, res) => {
	Creator.find({
		id: req.session.creator.id,
	}, function (err, result) {
		//console.log(result)
		if (err) {
			res.json(err)
		} else if (result != null) {
			var array1 = result[0].likelist.slice(-1)
			var array2 = result[0].likelist.slice(-2)
			var array3 = result[0].likelist.slice(-3)
			console.log(array1[0])
			var query = {
				$or: [
					{ truckid: `${array1[0]}` },
					{ truckid: `${array2[0]}` },
					{ truckid: `${array3[0]}` },
				]
			};
			Truck.find(query, function (err, result) {
				if (err) {
					console.log(err)
					res.render('creatorlogin', { info: 'エラーが発生しました。' })
				} else if (result != null) {
					res.json(result)
					console.log(result)
				}
			});
		}
	})
});

app.get('/addlike', (req, res) => {
	Creator.find({
		id: req.session.creator.id,
	}, function (err, result) {
		//console.log(result)
		if (err) {
			res.json(err)
		} else if (result != null) {
			var array1 = result[0].likelist.slice(-1)
			console.log(array1)
			var query = {
				truckid: `${array1}`
			};
			Truck.find(query, function (err, result) {
				if (err) {
					console.log(err)
					res.render('creatorlogin', { info: 'エラーが発生しました。' })
				} else if (result != null) {
					res.json(result)
				}
			});
		}
	})
});
app.post('/deletelike', (req, res) => {
	if (req.session.creator) {
		Truck.findOne({
			title: req.body.title,
			artist: req.body.artist
		}, function (err, result) {
			if (err) {
				console.log(err)
				res.render('creatorlogin', { info: 'エラーが発生しました。' })
			} else if (result != null) {
				console.log(result)
				var liked = result.liked - 1;
				console.log(result.likelist)
				TruckModel.updateOne(
					{ truckid: result.truckid },
					{ $set: { liked: liked } },
					function (err, result1) {
						if (err) {
							console.log(err)
						} else if (result1 != null) {
							console.log(result1)
						}
					}
				)
				Creator.findOne({
					id: req.session.creator.id,
				}, function (err, result2) {
					//console.log(result)
					if (err) {
						res.json(err)
					} else if (result2 != null) {
						console.log(result2.likelist)
						console.log(result.truckid)
						var idx = result2.likelist.indexOf(result.truckid)
						console.log(idx)
						CreatorModel.updateOne(
							{ id: req.session.creator.id },
							{ $pull: { likelist: result.truckid } },
							function (err, result) {
								if (err) {
									console.log(err)
								} else if (result != null) {
									res.json(result)
								}
							}
						)
					}
				});
			}
		})
	} else {

	}
});

app.get('/mypageparams', (req, res) => {
	Creator.find({
		id: req.session.creator.id,
	}, function (err, result) {
		//console.log(result)
		if (err) {
			res.json(err)
		} else if (result != null) {
			res.json(result)
		}
	});
});



app.get('/likedarray', (req, res) => {
	Creator.findOne({
		id: req.session.creator.id,
	}, function (err, result) {
		//console.log(result)
		if (err) {
			res.json(err)
		} else if (result != null) {
			res.json(result.likelist)
		}
	});
});

app.post('/creatorpage', (req, res) => {
	Truck.find({
		artist: req.body.artist
	}, function (err, result){
		if(err){
		} else if(result != null) {
			res.json(result)
		}
	});
});


///////////////アップロード
var upload = multer({
	storage: multerS3({
		s3: s3,
		acl: 'public-read',
		bucket: 'bucket-jin-test',
		acl: 'public-read',
		metadata: function (req, file, cb) {
			cb(null, { fieldName: file.fieldname });
		},
		key: function (req, file, cb) {
			cb(null, `${req.session.creator.name}` + '_' + file.originalname)
		}
	})
})

app.post('/upload', upload.array('upload', 2), (req, res) => {
	console.log(req.files)
	console.log(req.body.title)
	console.log(req.body.category)
	if (req.session.creator) {
		var Truck = new TruckModel();
		Truck.truckid = (Date.now() / 2).toString() + Date.now().toString();
		Truck.id = req.session.creator.id;
		Truck.title = req.body.title;
		Truck.artist = req.session.creator.name;
		Truck.image = req.files[0].key;
		Truck.m4a = req.files[1].key;
		Truck.category = req.body.category;
		Truck.played = 0,
			Truck.liked = 0,
			Truck.save(function (err) {
				if (err) { console.log(err); }
			});
	} else {
		res.redirect('creatorlogin', { info: 'セッションが切れました。もう一度ログインしてください。' })
	}
	res.redirect('submit')
});
var uploadtopimg = multer({
	storage: multerS3({
		s3: s3,
		acl: 'public-read',
		bucket: 'bucket-jin-test',
		metadata: function (req, file, cb) {
			cb(null, { fieldName: file.fieldname });
		},
		key: function (req, file, cb) {
			cb(null, `${req.session.creator.name}` + '_topimg_' + file.originalname)
		}
	})
})

app.post('/upload-topimg', uploadtopimg.any('topimg'), (req, res) => {
	console.log(req.body)
	console.log(req.files)
	if (req.session.creator) {
		Creator.find({
			id: req.session.creator.id,
		}, function (err, result) {
			//console.log(result)
			if (err) {
				res.json(err)
			} else if (result != null) {
				console.log(result)
				if (result[0].topimg !== 'default-topimg-official.png') {
					s3delobj(result)
					async function s3delobj(result) {
						await s3.deleteObject(
							{
								Bucket: 'bucket-jin-test',
								Key: result[0].topimg
							}).promise()
					}
				}
			}
		})
		CreatorModel.updateOne(
			{ id: req.session.creator.id },
			{ $set: { topimg: `${req.files[0].key}` } },
			function (err, result) {
				if (err) {
					console.log(err)
				} else if (result != null) {
					console.log(result)
				}
			})
	} else {
		res.redirect('creatorlogin', { info: 'セッションが切れました。もう一度ログインしてください。' })
	}
	res.redirect('mypage')
});

var uploadbackimg = multer({
	storage: multerS3({
		s3: s3,
		acl: 'public-read',
		acl: 'public-read',
		bucket: 'bucket-jin-test',
		metadata: function (req, file, cb) {
			cb(null, { fieldName: file.fieldname });
		},
		key: function (req, file, cb) {
			cb(null, `${req.session.creator.name}` + '_backimg_' + file.originalname)
		}
	})
})

app.post('/upload-backimg', uploadbackimg.any('backimg'), (req, res) => {
	console.log(req.body)
	console.log(req.files)
	if (req.session.creator) {
		Creator.find({
			id: req.session.creator.id,
		}, function (err, result) {
			//console.log(result)
			if (err) {
				res.json(err)
			} else if (result != null) {
				console.log(result)
				if (result[0].backimg !== 'default-backimg-official.png') {
					s3delobj(result)
					async function s3delobj(result) {
						await s3.deleteObject(
							{
								Bucket: 'bucket-jin-test',
								Key: result[0].backimg
							}).promise()
					}
				}
			}
		})
		CreatorModel.updateOne(
			{ id: req.session.creator.id },
			{ $set: { backimg: `${req.files[0].key}` } },
			function (err, result) {
				if (err) {
					console.log(err)
				} else if (result != null) {
					console.log(result)
				}
			})
	} else {
		res.redirect('creatorlogin', { info: 'セッションが切れました。もう一度ログインしてください。' })
	}
	res.redirect('mypage')
});
//////////////


/////////S3listObjects
var bucketParams = {
	Bucket: 'bucket-jin-test',
};
function urllistObjects() {
	s3.listObjects(bucketParams, function (err, data) {
		if (err) {
			console.log("Error", err);
		} else {
			var i = 0
			while (i < data.Contents.length) {
				var params = { Bucket: 'bucket-jin-test', Key: data.Contents[i].Key };
				s3.getSignedUrl('getObject', params, function (err, url) {
					console.log(url);
				});
				i++
			}
		}
	});
}
/////////

//////////creators page
app.get( '/artists', function( req, res ){
	var creator = req.query.name;
	Creator.findOne({
		name: creator
	}, function (err, result) {
		if (err) {
			res.json(err)
		} else if (result != null) {
			var follower = result.followerlist.length 
			if (req.session.creator){
				Creator.findOne({
					id: req.session.creator.id
				}, function (err, result2) {
					if (err) {
						res.json(err)
					} else if (result2 != null) {
						if (result2.followlist.indexOf(result.id) != -1) {
							var css = '#999'
							var following = 'フォロー中'
						} else {
							var css = '#333'
							var following = 'フォローする'
						}
						res.render('creators', {
							artistname: result.name,
							topimg: result.topimg,
							backimg: result.backimg,
							follower: follower,
							css: css,
							following: following
						})	
					}
				})
			} else {
				res.render('creators', {
					artistname: result.name,
					topimg: result.topimg,
					backimg: result.backimg,
					follower: follower,
					css: "#333",
					following: "フォローする"
				})
			}
		}
	});
});

///////////////

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;

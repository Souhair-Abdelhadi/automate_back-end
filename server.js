
const express = require("express");
const { json } = require('body-parser');
const http = require('http');
const path = require('path')
const hbs = require('nodemailer-express-handlebars')
var validator = require("validator")
var jwt = require('jsonwebtoken');
const cors = require("cors");
const nodemailer = require('nodemailer')
var bodyParser = require('body-parser')
const corsOptions ={
    origin:'*', 
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200,
 }
 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: "abdelhadi0495mail@gmail.com",
      pass: "hdreoz1z2"
    }
  });



const app = express();
app.use(bodyParser.json({limit: '10mb'}));
app.use(cors(corsOptions)) // Use this after the variable declaration

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({limit: '10mb',extended: true}));

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

const PORT = process.env.PORT || 3001;
const hostname = 'localhost';


const mysql = require('mysql2');

var mysqlConnection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "automate",
});




mysqlConnection.connect((err)=> {
    if(!err)
    {
        console.log("Connected");
        mysqlConnection.query('select `refresh_token` from `user` where email = ?;',["souhairabdelhadi@gmail.com"],function(err,res){
            console.log(res)
        })
    }
    else
    {
        console.log("Connection Failed");
    }
})


app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });




// const server = http.createServer((req, res) => {

    

//     res.statusCode = 200;
//     res.setHeader('Content-Type', 'text/plain');
//     res.end('Hello world!\n')
    
    

//   });


// server.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`);
// });

/*
mysqlConnection.connect((err)=> {
    if(!err)
    {
        console.log("Connected");
        mysqlConnection.query("select * from `user`;",function(err,res){
            console.log(err)
            if(err){
                return nodeRes.status(201).json({
                    status : 'error',
                    message : 'error while querying data',
                    doc : []
                })
            }
            else {
                return nodeRes.status(200).json({
                    status : 'success',
                    message : 'data returned',
                    doc : res
                })
            }
    
    
        })
    }
    else
    {
        console.log("Connection Failed");
        return nodeRes.status(501).json({
            status : 'error',
            message : 'internal error while connecting to database',
            doc : []
        })
    }
})
*/

// verify and authenticate requests
function authenticateToken(req,res,next){

    var bearerHeader = req.headers['authorization'];
    var token = bearerHeader || bearerHeader.split(" ")[1];
    if(token === null){
        return res.status(401).json({
            status : "TOKEN_ERROR",
            message : "error while processing request, token was not given"
        })
    }
    token = token.split(" ")[1]
    jwt.verify(token,'secretkey', (err, user) => {
        
        if (err) return res.status(403).json({
            status : "TOKEN_ERROR",
            message : "error while processing request, access_token expired"
        })
        //req.user = user
        next()
    })

}


// refresh an expired access_token 
app.post('/token', (nodeReq, nodeRes) => {
    const {token:refreshToken, email} = nodeReq.body
    console.log("email : ",email,"token :",refreshToken)

    if (refreshToken == null) 
    return nodeRes.status(401).json({
        status : "TOKEN_ERROR",
        message : "received an empty refresh token"
    })

    mysqlConnection.connect((err)=> {
        if(!err)
        {
            console.log("Connected");
            mysqlConnection.query("select `refresh_token` from `ingenieurs` where email = ?;",[email],function(err,res){
                console.log("err :",err,"res :",res)
                if(err){
                    return nodeRes.status(201).json({
                        status : 'error',
                        message : 'error while querying data',
                        doc : []
                    })
                }
                else if(res.length != 0) {
                    console.log(res)
                    console.log("res[0] :",res[0])
                    console.log("refresh_token : ",refreshToken)
                    if(res[0].refresh_token == refreshToken){
                        jwt.verify(refreshToken, 'secretkey', (err, user) => {
                            if (err) return nodeRes.status(500).json({
                                status : "TOKEN_ERROR",
                                message : "error while processing refresh token in database"
                            })
                            console.log("user credentials :",user)
                            const accessToken = jwt.sign({email : user.email,password : user.password,admin : user.admin},'secretkey',{expiresIn : '30s' })
                            nodeRes.status(200).json({
                                  access_token: accessToken,
                                  status : 'OK',
                                  message : 'new token has been generated'
                              })
                        })
                    }
                    else {
                        console.log("error res empty :",res)
                        return nodeRes.status(401).json({
                            status : "TOKEN_ERROR",
                            message : "you need to log in"
                        })
                    }
                }
                else {
                    console.log("error user doesn't exist")
                    return nodeRes.status(401).json({
                        status : "TOKEN_ERROR",
                        message : "you need to log in"
                    })
                }
        
        
            })
        }
        else
        {
            console.log("Connection Failed");
            return nodeRes.status(501).json({
                status : 'error',
                message : 'internal error while connecting to database',
                doc : []
            })
        }
    })
    

  })


  // login to an account
app.post(('/login'),(nodeReq,nodeRes)=>{

    const   {email, password} = nodeReq.body;
 

    if(email && password){
        mysqlConnection.connect((err)=> {
            if(!err)
            {
                console.log("Connected");
                mysqlConnection.query("select `password`,nomIng,admin from `ingenieurs` where `email` = ? ;",[email],function(err,res){
                    console.log(err)
                    if(err){
                        return nodeRes.status(201).json({
                            status : 'LOGIN_ERROR',
                            message : 'error while querying data',
                            doc : []
                        })
                    }
                    else if(res.length !== 0 ) {
                        if(res[0].password === password){
                            const user = {email,...res[0]}
                            const access_token = jwt.sign(user,'secretkey',{expiresIn : '30s' })
                            const refresh_token = jwt.sign(user,'secretkey',{expiresIn : '1y'})
                            if(!access_token || !refresh_token){
                                return nodeRes.status(500).json({
                                    status : "LOGIN_ERROR",
                                    message : "error while processing login"
                                })
                            }
                            else {
                                mysqlConnection.query("update `ingenieurs` set `refresh_token` = ? where `email` = ? ;",[refresh_token,email],function(err,res){
    
    
                                    if(err){
                                        console.log(err)
                                        return nodeRes.status(500).json({
                                            status : "LOGIN_ERROR",
                                            message : "user failed to authenticate due to db error",
                                        })
                                    }
                                    else {
                                        console.log("user selected data :",user)
                                        return nodeRes.status(200).json({
                                            status : "OK",
                                            message : "user authenticated",
                                            access_token,
                                            refresh_token,
                                            user : user,
                                        })
                                    }
    
                                })
                            }
                        }
                        else if(res[0].password !== password){
                            return nodeRes.status(200).json({
                                status : "LOGIN_ERROR",
                                message : "access denied, password is incorrect",
                                docs : []
                            })
                            
                        }
                    }
                    else {
                        return nodeRes.status(200).json({
                            status: "LOGIN_ERROR",
                            message : "no user found with this email",
                            docs : []
                        })
                    }
            
            
                })
            }
            else
            {
                console.log("Connection Failed");
                return nodeRes.status(501).json({
                    status : 'error',
                    message : 'internal error while connecting to database',
                    doc : []
                })
            }
        })
    }
    else {
        return nodeRes.status(200).json({
            status: "LOGIN_ERROR",
            message : "Data sent was not complete",
            docs : []
        })
    }

/*
    auth.find({email : email},(err,docs)=>{
 
         if(err){
             return nodeRes.status(500).json({
                 status : "LOGIN_ERROR",
                 message : "Error happened while fetching data in database",
                 docs: []
             })
         }
         else if(docs.length !== 0){
 
              if(docs[0].password === password){
                 const user = {...docs[0]}
                 const access_token = jwt.sign(user,'secretkey',{expiresIn : '20s' })
                 const refresh_token = jwt.sign(user,'secretkey',{expiresIn : '1y'})
                 if(!access_token || !refresh_token){
                     return nodeRes.status(500).json({
                         status : "LOGIN_ERROR",
                         message : "error while processing login"
                     })
                 }
                 else {
                     //refreshTokens.push(refresh_token)
                     userRefreshToken.find({email : email},(err,docs)=>{
 
                         if(err){
                             return nodeRes.status(500).json({
                                 status : "LOGIN_ERROR",
                                 message : "user failed to authenticate due to db error",
                             })
                         }
                         else if(docs.length != 0){
                             userRefreshToken.where({email : email}).updateOne({
                                 $set : {"refresh_token" : refresh_token }
                             },(err,writeRes)=>{
 
                                 if(err){
                                     return nodeRes.status(500).json({
                                         status : "LOGIN_ERROR",
                                         message : "user failed to authenticate due to db error",
                                     })
                                 }
                                 else{
                                     return nodeRes.status(200).json({
                                         status : "OK",
                                         message : "user authenticated",
                                         access_token,
                                         refresh_token,
                                         user : user._doc,
                                     })
                                 }
 
                             })
                         }
                         else{
                             userRefreshToken.create({email : email,refresh_token : refresh_token},function(err,data){
 
                                 if(err){
                                     return nodeRes.status(500).json({
                                         status : "LOGIN_ERROR",
                                         message : "user failed to authenticate due to db error",
                                     })
                                 }
                                 else {
                                     return nodeRes.status(200).json({
                                         status : "OK",
                                         message : "user authenticated",
                                         access_token,
                                         refresh_token,
                                         user : user._doc
                                     })
                                 }
 
                             })
                             
                         }
                     })
                 }
                 
             }
             else if(docs[0].password !== password){
                 return nodeRes.status(200).json({
                     status : "LOGIN_ERROR",
                     message : "access denied, password is incorrect",
                     docs : []
                 })
                 
             }
         }
         else if(docs.length === 0){
             return nodeRes.status(200).json({
                 status: "LOGIN_ERROR",
                 message : "no user found with this email",
                 docs : []
             })
         }
     })
     */
 
    })

app.get('/clients',authenticateToken,(nodeReq, nodeRes)=>{
    
        mysqlConnection.connect((err)=> {
            if(!err)
            {
                mysqlConnection.query("SELECT * FROM `clients`;",function(err,res){
                    
                    if(err){
                        console.log(err)
                        return nodeRes.status(201).json({
                            status : 'CLIENT_ERROR',
                            message : 'error while querying data',
                            doc : []
                        })
                    }
                    else {
                        return nodeRes.status(200).json({
                            status : 'OK',
                            message : 'Data returned',
                            doc : res
                            
                        })
                    }
            
            
                })
            }
            else
            {
                console.log("Connection Failed");
                return nodeRes.status(501).json({
                    status : 'CLIENT_ERROR',
                    message : 'internal error while connecting to database',
                    doc : []
                })
            }
        })

})

app.get('/ingenieurs',authenticateToken,(nodeReq, nodeRes)=>{
    
    mysqlConnection.connect((err)=> {
        if(!err)
        {
            mysqlConnection.query("SELECT * FROM `ingenieurs`;",function(err,res){
                
                if(err){
                    console.log(err)
                    return nodeRes.status(201).json({
                        status : 'INGENIEURS_ERROR',
                        message : 'error while querying data',
                        doc : []
                    })
                }
                else {
                    return nodeRes.status(200).json({
                        status : 'OK',
                        message : 'Data returned',
                        doc : res
                        
                    })
                }
        
        
            })
        }
        else
        {
            console.log("Connection Failed");
            return nodeRes.status(501).json({
                status : 'INGENIEURS_ERROR',
                message : 'internal error while connecting to database',
                doc : []
            })
        }
    })

})

app.post('/ajouter_ingenieur',authenticateToken,(nodeReq, nodeRes)=>{

    const {nomIng,numIng,email,password,specialite,admin} = nodeReq.body
    console.log(nomIng,numIng,email,password,specialite,admin)
    if( nomIng && numIng && email && password && 
        specialite && typeof admin != 'undefined' && validator.default.isEmail(email)){
            
            mysqlConnection.connect((err)=> {
                if(!err)
                {
                    mysqlConnection.query("INSERT INTO `ingenieurs`( `nomIng`, `numIng`, `email`, `password`, `specialite`, `admin`) VALUES (?,?,?,?,?,?)",[nomIng,numIng,email,password,specialite,admin],function(err,res){
                        
                        if(err){
                            console.log(err)
                            return nodeRes.status(201).json({
                                status : 'INGENIEUR_ERROR',
                                message : 'Error while inserting the new ingenieur',
                                doc : []
                            })
                        }
                        else {

                            // point to the template folder
                            const handlebarOptions = {
                                viewEngine: {
                                    partialsDir: path.resolve('./views/'),
                                    defaultLayout: false,
                                },
                                viewPath: path.resolve('./views/'),
                            };

                            const mailConfigurations = {

                                // It should be a string of sender email
                                from: 'abdelhadi0495mail@gmail.com',
                            
                                // Comma Separated list of mails
                                to: email,
                            
                                // Subject of Email
                                subject: 'Your credentials to access admin website',
                            
                                template: 'email',

                                context:{
                                    fullName  : nomIng, 
                                    email: email,
                                    password : password
                                }

                            };
                            transporter.use('compile',hbs(handlebarOptions))
                            transporter.sendMail(mailConfigurations,function(err,info){
                                if(err){
                                    console.log(err)
                                }
                                else {
                                    console.log("email was sent to "+email)
                                    return nodeRes.status(200).json({
                                        status : 'OK',
                                        message : 'Email sent successfully '
                                    })
                                }
                            })
                            return nodeRes.status(200).json({
                                status : 'OK',
                                message : 'Ingeneiur '+nomIng+ ' added to database',
                                
                            })
                        }
                
                
                    })
                }
                else
                {
                    console.log("Connection Failed");
                    return nodeRes.status(501).json({
                        status : 'INGENIEUR_ERROR',
                        message : 'internal error while connecting to database',
                        doc : []
                    })
                }
            })
    }
    else {
        return nodeRes.status(400).json({
            status : 'ERROR',
            message : "Les données envoyer ne sont pas complete/valider!"
        })
    }
})

app.post('/ajouter_client',authenticateToken,(nodeReq, nodeRes)=>{

    const {nom_labo,numPhone,ville,adresse} = nodeReq.body;
    
    
    if( !nom_labo || !numPhone || !ville || !adresse ||  nom_labo.length === 0 || numPhone.length < 10 || nom_labo.length === 0 || nom_labo.length === 0){
        console.log("data sent was not complet")
        return nodeRes.status(400).json({
            status : 'error',
            message : "Les données envoyer ne sont pas complete!"
        })
    }
    else {
        console.log("nom labo :",nom_labo,"ville :",ville,"adresse :",adresse)
        mysqlConnection.connect((err)=> {
            if(!err)
            {
                mysqlConnection.query("INSERT INTO `clients`(`nom_labo`, `numPhone`, `ville`, `adresse`) VALUES (?,?,?,?);",[nom_labo,numPhone,ville,adresse],function(err,res){
                    
                    if(err){
                        console.log(err)
                        return nodeRes.status(201).json({
                            status : 'CLIENT_ERROR',
                            message : 'error while inserting the new client',
                            doc : []
                        })
                    }
                    else {
                        return nodeRes.status(200).json({
                            status : 'OK',
                            message : 'Client '+nom_labo+ ' added to database',
                            
                        })
                    }
            
            
                })
            }
            else
            {
                console.log("Connection Failed");
                return nodeRes.status(501).json({
                    status : 'CLIENT_ERROR',
                    message : 'internal error while connecting to database',
                    doc : []
                })
            }
        })
        
    }


})

app.get('/automates',authenticateToken,(nodeReq, nodeRes)=>{
    
    const {email} = nodeReq.query
    if(email) {
        mysqlConnection.connect((err)=> {
            if(!err)
            {
                mysqlConnection.query("SELECT `automates`.* FROM `automates`,`ingenieurs` WHERE automates.id_ing = ingenieurs.idIng AND ingenieurs.email = ? and traiter = 0;",[email],function(err,res){
                    
                    if(err){
                        console.log(err)
                        return nodeRes.status(201).json({
                            status : 'AUTOMATE_ERROR',
                            message : 'error while querying data',
                            doc : []
                        })
                    }
                    else {
                        return nodeRes.status(200).json({
                            status : 'OK',
                            message : 'Data returned',
                            doc : res
                            
                        })
                    }
            
            
                })
            }
            else
            {
                console.log("Connection Failed");
                return nodeRes.status(501).json({
                    status : 'AUTOMATE_ERROR',
                    message : 'internal error while connecting to database',
                    doc : []
                })
            }
        })
    }
    else {
        return nodeRes.status(401).json({
            status : 'AUTOMATE_ERROR',
            message : 'data sent was not complete',
            doc : []
        })
    }

})

app.post('/ajouter_automate',authenticateToken,(nodeReq, nodeRes)=>{

    const {idLabo,idIng,nom_automate,marque_automate,image} = nodeReq.body;
    console.log(idLabo,idIng,nom_automate,marque_automate,image)
    
    if(!idLabo || !idIng || !nom_automate || !marque_automate || !image ){
        console.log("data sent was not complet")
        return nodeRes.status(400).json({
            status : 'error',
            message : "Les données envoyer ne sont pas complete!"
        })
    }
    else {
        
        mysqlConnection.connect((err)=> {
            if(!err)
            {
                mysqlConnection.query("INSERT INTO `automates`(`idLabo`, `id_ing`, `nomAutomate`, `marqueAutomate`,`traiter`,`image`) VALUES (?,?,?,?,?,?);",[idLabo,idIng,nom_automate,marque_automate,0,image],function(err,res){
                    
                    if(err){
                        console.log(err)
                        return nodeRes.status(201).json({
                            status : 'AUTOMATE_ERROR',
                            message : 'error while inserting the new client',
                            doc : []
                        })
                    }
                    else {
                        return nodeRes.status(200).json({
                            status : 'OK',
                            message : 'new automate added',
                            
                        })
                    }
            
            
                })
            }
            else
            {
                console.log("Connection Failed");
                return nodeRes.status(501).json({
                    status : 'AUTOMATE_ERROR',
                    message : 'internal error while connecting to database',
                    doc : []
                })
            }
        })
        
    }


})

app.get('/interventions',authenticateToken,(nodeReq, nodeRes)=>{
    
    const {email} = nodeReq.query

    mysqlConnection.connect((err)=> {
        if(!err)
        {
            mysqlConnection.query("SELECT `interventions`.*,`automates`.`nomAutomate`, `ingenieurs`.`nomIng` FROM `interventions`,`ingenieurs`,`automates` where interventions.id_automate = automates.idAutomate and interventions.id_ing = ingenieurs.idIng and ingenieurs.email = ?;",[email],function(err,res){
                
                if(err){
                    console.log(err)
                    return nodeRes.status(201).json({
                        status : 'INTERVENTIONS_ERROR',
                        message : 'error while querying data',
                        doc : []
                    })
                }
                else {
                    return nodeRes.status(200).json({
                        status : 'OK',
                        message : 'Data returned',
                        doc : res
                        
                    })
                }
        
        
            })
        }
        else
        {
            console.log("Connection Failed");
            return nodeRes.status(501).json({
                status : 'INTERVENTIONS_ERROR',
                message : 'internal error while connecting to database',
                doc : []
            })
        }
    })

})

app.post('/ajouter_intervention',authenticateToken,(nodeReq, nodeRes)=>{

    const {id_automate,email,date_inter,duree_inter,description,listePieceSelectionner} = nodeReq.body;
    console.log(id_automate,email,date_inter,duree_inter,description,listePieceSelectionner)
    
    if(!id_automate || !email || !date_inter || !duree_inter || !description ){
        console.log("data sent was not complet")
        return nodeRes.status(400).json({
            status : 'ERROR',
            message : "Les données envoyer ne sont pas complete!"
        })
    }
    else {
        
        mysqlConnection.connect((err) =>{
            if(err){
                return nodeRes.status(500).json({
                    status : 'DB_ERROR',
                    message : "Internal error while connecting to db"
                })
            }
            else{
                mysqlConnection.query("SELECT `idIng` FROM `ingenieurs` WHERE email = ?;",[email],function(err,res0){
                    if(err){
                        return nodeRes.status(500).json({
                            status : 'DB_ERROR',
                            message : "Internal error while querying data"
                        })
                    }
                    else {
                        if(res0[0].idIng){
                            mysqlConnection.connect((err)=> {
                                if(!err)
                                {
                                    mysqlConnection.query("INSERT INTO `interventions`( `id_automate`, `date_inter`, `id_ing`, `duree_inter`, `description`) VALUES (?,?,?,?,?);",[id_automate,date_inter,res0[0].idIng,duree_inter,description],function(err,res){
                                        
                                        if(err){
                                            console.log(err)
                                            return nodeRes.status(201).json({
                                                status : 'INTERVENTION_ERROR',
                                                message : 'error while inserting the new intervention',
                                                doc : []
                                            })
                                        }
                                        else {
                                            mysqlConnection.query("UPDATE `automates` SET `traiter`= 1 WHERE idAutomate = ?;",[id_automate],function(err,res2){
                                                if(err){
                                                    return nodeRes.status(201).json({
                                                        status : 'INTERVENTION_ERROR',
                                                        message : 'error while inserting the new intervention',
                                                        doc : []
                                                    })
                                                }
                                                else {
                                                    if( listePieceSelectionner && listePieceSelectionner.length != 0){
                                                        for(var i =0; i<listePieceSelectionner.length ; i++){
                                                            mysqlConnection.query("INSERT INTO `pieceRechange_automate`(`idAutomate`, `idPiece`) VALUES (?,?);",[id_automate,listePieceSelectionner[i]],function(err,res2){
                                                                if(err){
                                                                    return nodeRes.status(201).json({
                                                                        status : 'INTERVENTION_ERROR',
                                                                        message : 'error while inserting automate pieces',
                                                                        doc : []
                                                                    })
                                                                }
                                                            })
                                                        }
                                                    }
                                                    return nodeRes.status(200).json({
                                                        status : 'OK',
                                                        message : 'new intervention added',
                                                        
                                                    })
                                                }
                                            })
                                        }
                                
                                
                                    })
                                }
                                else
                                {
                                    console.log("Connection Failed");
                                    return nodeRes.status(501).json({
                                        status : 'DB_ERROR',
                                        message : 'internal error while connecting to database',
                                        doc : []
                                    })
                                }
                            })
                        }
                        else {
                            return nodeRes.status(500).json({
                                status : 'DB_ERROR',
                                message : "No engineer found with this email"
                            })
                        }
                    }
                })
            }
        })
        
    }

})

app.get('/pieces_rechanges',authenticateToken,(nodeReq, nodeRes)=>{
    
        mysqlConnection.connect((err)=> {
            if(!err)
            {
                mysqlConnection.query("SELECT * FROM `pieceDeRechange` ;",function(err,res){
                    
                    if(err){
                        console.log(err)
                        return nodeRes.status(201).json({
                            status : 'PIECE_RECHANGE_ERROR',
                            message : 'error while querying data',
                            doc : []
                        })
                    }
                    else {
                        return nodeRes.status(200).json({
                            status : 'OK',
                            message : 'Data returned',
                            doc : res
                            
                        })
                    }
            
            
                })
            }
            else
            {
                console.log("Connection Failed");
                return nodeRes.status(501).json({
                    status : 'PIECE_RECHANGE_ERROR',
                    message : 'internal error while connecting to database',
                    doc : []
                })
            }
        })

})

app.post('/ajouter_piece_rechange',authenticateToken,(nodeReq, nodeRes)=>{

    const {nom_piece,marque_piece} = nodeReq.body;
    
    
    if( !nom_piece || !marque_piece ){
        
        console.log("data sent was not complet")
        return nodeRes.status(400).json({
            status : 'error',
            message : "Les données envoyer ne sont pas complete!"
        })
    }
    else {
        console.log(nom_piece,marque_piece)
        mysqlConnection.connect((err)=> {
            if(!err)
            {
                mysqlConnection.query("INSERT INTO `pieceDeRechange`(`nomPiece`, `marquePiece`) VALUES (?,?);",[nom_piece,marque_piece],function(err,res){
                    
                    if(err){
                        console.log(err)
                        return nodeRes.status(201).json({
                            status : 'PIECE_RECHANGE_ERROR',
                            message : 'error while inserting the new client',
                            doc : []
                        })
                    }
                    else {
                        return nodeRes.status(200).json({
                            status : 'OK',
                            message : 'new piece added ',
                            
                        })
                    }
            
            
                })
            }
            else
            {
                console.log("Connection Failed");
                return nodeRes.status(501).json({
                    status : 'PIECE_RECHANGE_ERROR',
                    message : 'internal error while connecting to database',
                    doc : []
                })
            }
        })
        
    }


})

app.post('/send_email',(nodeReq, nodeRes)=>{

    const {email,phone,message,fullName} = nodeReq.body

    if(email && fullName) {
        // point to the template folder
        const handlebarOptions = {
            viewEngine: {
                partialsDir: path.resolve('./views/'),
                defaultLayout: false,
            },
            viewPath: path.resolve('./views/'),
        };

        const mailConfigurations = {

            // It should be a string of sender email
            from: email,
        
            // Comma Separated list of mails
            to: "abdelhadi0495mail@gmail.com",
        
            // Subject of Email
            subject: 'Request for assistance',
        
            template: 'potentialClientEmail',

            context:{
                fullName  : fullName, 
                email: email,
                message : message,
                phone : phone
            }

        };
        transporter.use('compile',hbs(handlebarOptions))
        transporter.sendMail(mailConfigurations,function(err,info){
            if(err){
                console.log(err)
            }
            else {
                console.log("Client "+email+ "sent an email to us")
                return nodeRes.status(200).json({
                    status : 'OK',
                    message : 'Email sent successfully '
                })
            }
        })

        

    }
    else {
        return nodeRes.status(401).json({
            status : 'EMAIL_ERROR',
            message : 'Les données envoie ne sont pas complet/valider '
        })
        
    }

})
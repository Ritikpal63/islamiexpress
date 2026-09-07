const express=require('express');
const cors=require('cors');
const helmet=require('helmet');
const rateLimit=require('./middleware/rateLimit');
const app=express();

app.set('trust proxy',1);
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(cors({origin:(process.env.WEB_ORIGIN||'http://localhost:3000').split(','),credentials:true}));
app.use(express.json({limit:'2mb'}));
app.use(express.urlencoded({extended:true,limit:'2mb'}));
app.use('/api',rateLimit({windowMs:60000,max:240}));

app.get('/api/health',(_req,res)=>res.json({success:true,name:'Islami Express API'}));
app.use('/api/auth',require('./routes/auth.routes'));
app.use('/api/articles',require('./routes/articles.routes'));
app.use('/api/interactions',require('./routes/interactions.routes'));
app.use('/api/comments',require('./routes/comments.routes'));
app.use('/api/public',require('./routes/public.routes'));
app.use('/api/admin',require('./routes/admin.routes'));

app.use((_req,res)=>res.status(404).json({success:false,message:'Route not found'}));
app.use((err,_req,res,_next)=>{
  console.error(err);
  const status=err.status||500;
  res.status(status).json({success:false,message:process.env.NODE_ENV==='production'&&status>=500?'Internal server error':err.message});
});
module.exports=app;

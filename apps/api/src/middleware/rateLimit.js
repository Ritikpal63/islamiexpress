const buckets=new Map();
module.exports=function rateLimit({windowMs=60000,max=120}={}){
  return (req,res,next)=>{
    const key=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').toString().split(',')[0].trim()+':'+req.path;
    const now=Date.now(); const v=buckets.get(key);
    if(!v||now-v.start>windowMs){buckets.set(key,{start:now,count:1});return next()}
    v.count++; if(v.count>max)return res.status(429).json({success:false,message:'Too many requests. Please try again later.'}); next();
  };
};

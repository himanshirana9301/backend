import {Router} from  "express"
import userModel from "../models/user.model.js"
import bcrypt from "bcryptjs"
import { generateTokens,verifyAccessToken, verifyRefreshToken } from "../utils/auth.js"
const router = Router()


 router.post("/register",async(req,res)=>{
     const {name, email,password} = req.body 
    
    const isUserExist = await userModel.findOne({email})
 if(isUserExist){
    return res.status(400).json({
        message : "user already exist",
        errror:[{
            path: "email",
            message:"user already exist"
        }
        ] 
        
    })
     
  
 }
const user = await userModel.create({
    name,
    email,
    passwordHash : await bcrypt.hash(password,10)
 })

 const {accessToken,refreshToken} = generateTokens({userId: user._id})

 user.refreshToken = refreshToken
 await user.save()

 res.cookie("refreshToken",refreshToken,{
    httpOnly :true
 })
 res.status(201).json({
    message:"user registered successfully", 
    data:{
        user:{
name: user.name,
email:user.email
        }
    },
    accessToken
 })
    })


    //get 

    router.get("/me",async(req,res)=>{

const accessToken = req.headers.authorization?.split(" ")[1]
try{
const  decode = verifyAccessToken(accessToken)
const user = await userModel.findById(decode.id)
res.status(200).json({
    message:"user fetched successfully",
    data:{
        user:{
            name:user.name,
            email:user.email
        }
    }
})
}
catch(error){
    return res.status(401).json({
        message:"unauthorised"
    })
}
    })

router.post("/refresh",async(req,res)=>{
    const refreshToken = req.cookies.refreshToken


    if(!refreshToken){
        return res.status(401).json({
            message:"unauthorized ,refresh token"

        })
    }



    try {
         const decode = await verifyRefreshToken(refreshToken)

         const user = await userModel.findById(decode.id)

if(refreshToken !== user.refreshToken){
    user.refreshToken =null
    await user.save()
    return res.status(401).json({
        message:"refresh token missmatch"
    })
}
const {accessToken,refreshToken: newRefreshToken} = generateTokens({userId: user._id})

res.cookie("refreshToken",newRefreshToken,{
httpOnly:true
})

 user.refreshToken = newRefreshToken
 await user.save()
res.status(201).json({
    message:"refresh token generated",
    accessToken
})
    } catch (error) {
        return res.staus(401).json({
        message:"unauthorised, invalid refresh token"
    })
    }
})

export default router
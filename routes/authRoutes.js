import express from "express";
import { LoginAppCtrl, createUserCtrl } from '../controllers/authController.js';
import jwt from 'jsonwebtoken';

function verifyToken(req, res, next) {
    console.log("verify token", req.headers.authorization);

    if (!req.headers.authorization) {
        return res.status(401).send('Unauthorized request');
    }

    let token = req.headers.authorization.split(' ')[1];
    console.log("verify token", token);

    if (token === 'null') {
        return res.status(401).send('Unauthorized request');
    }

    try {
        let payload = jwt.verify(token, process.env.SecretKey);

        if (!payload) {
            return res.status(401).send('Unauthorized request');
        }

        req.userId = payload.subject;
        next();
    } catch (error) {
        return res.status(401).send('Unauthorized request');
    }
}

const router = express.Router();

router.post("/login", LoginAppCtrl);
router.post("/create", createUserCtrl);

export default router;

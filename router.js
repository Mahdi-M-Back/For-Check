const app = require('./app');
const userRouter = require('./modules/user/router/user.router')

app.use('/api/v1/users',userRouter)
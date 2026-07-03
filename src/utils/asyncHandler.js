// warpper function to handle async errors in express

/* One way to handle async errors in express is to use Promise.resolve() and catch() method. This is not a good practice. So we can create a wrapper function which will handle the errors for us. This is called asyncHandler. It takes a function as an argument and returns a new function which will handle the errors for us. We can use this function to wrap our route handlers. This way we don't have to write try catch block in every route handler. */

const asyncHandler = (requesthandler) => (req,res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));  
}

/* One way to handle async errors in express is to use try catch block in every route handler. But this is not a good practice. So we can create a wrapper function which will handle the errors for us. This is called asyncHandler. It takes a function as an argument and returns a new function which will handle the errors for us. We can use this function to wrap our route handlers. This way we don't have to write try catch block in every route handler. 


const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        res.status(error.code || 500).json({
            success: false,
            message: error.message
        })
    }
}
    */
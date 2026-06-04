const mongoose = require('mongoose') 

function abstractSchema(options){
  const schema = new mongoose.Schema(
    {
      ...options,
      isDeleted:{
        type:Boolean,
        default:false
      },
      deletedDate:{
        type:Date,
        required:false
      }
    }
  )

  schema.pre(/^find/ , function(){
    this.where({isDeleted:false})
  })

  schema.pre(/^update/ , function(){
    this.where({isDeleted:false})
  })

  return schema;
}

module.exports = abstractSchema
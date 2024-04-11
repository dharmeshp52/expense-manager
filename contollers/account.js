const User = require('../models/user');
const Account = require('../models/account');
const Transaction = require('../models/transaction');
const mongoose = require('mongoose');
const { transporter } = require('../middleware/utility');
const e = require('express');

/**
 * Get all account page
 * @param {*} req
 * @param {*} res
 * @returns {Promise} Promise object representing the response
 */
async function getAllAccount(req, res) {
  try {
    const { account } = res.locals;
    if (account) {
      return res
        .status(200)
        .render('pages/allAccount', { account: account, msg: null });
    } else {
      return res.status(400).json({
        msg: 'someThing wrong to fetch local form auth detail',
      });
    }
  } catch (err) {
    return res.status(400).json({
      msg: 'someThing wrong to fetch account detail',
    });
  }
}

/**
 * Add an account
 * @param {*} req
 * @param {*} res
 * @returns {Promise} Promise object representing the response
 */
async function addAccount(req, res) {
  try {
    const { name } = req.query;
    const { user } = res.locals;
    let id = mongoose.Types.ObjectId(req.userData.userId);
    const add = new Account({
      userId: id,
      name: name,
      members: [{ name: user.name, email: user.email, isAdmin: true }],
    });
    await add.save();
    res.redirect('/account');
  } catch (err) {
    return res.status(400).json({
      msg: 'Something went wrong!',
    });
  }
}

/**
 * Update account name
 * @param {*} req
 * @param {*} res
 * @returns {Promise} Promise object representing the response
 */
async function updateAccountName(req, res) {
  try {
    const { user } = res.locals;
    const { id, name } = req.query;
    const update = await Account.findOneAndUpdate(
      { _id: id },
      { $set: { name: name } }
    );
    await update.save();
    const account = await Account.find({ 'members.email': user.email });
    return res
      .status(200)
      .render('pages/allAccount', { account, msg: 'accountUpdate' });
  } catch (err) {
    return res.status(400).json({
      msg: 'Something went wrong!',
    });
  }
}

/**
 * Get add member page
 * @param {*} req
 * @param {*} res
 * @returns {Promise} Promise object representing the response
 */
async function getAddMember(req, res) {
  try {
    const id = req.params.id;
    const account = await Account.findOne({ _id: id });
    res.render('pages/addMember', { account: account, msg: null });
  } catch (err) {
    return res.status(400).json({
      msg: 'Something went wrong!',
    });
  }
}

/**
 * Add a member to an account
 * @param {*} req
 * @param {*} res
 * @returns {Promise} Promise object representing the response
 */
async function addMember(req, res) {
  try {
    const { account } = res.locals;
    let { id, mName, mEmail } = req.body;
    let member = { name: mName, email: mEmail };
    let data = await Account.findOne({ _id: id });
    let members = data.members;
    let check = false;
    for (let i = 0; i < members.length; i++) {
      if (members[i].email == mEmail) {
        check = true;
        break;
      }
    }
    if (check == false) {
      const update = await Account.findOneAndUpdate(
        { _id: id },
        { $push: { members: member } }
      );
      await update.save();
      let info = transporter.sendMail({
        from: '"<smtp.mailtrap.io>', // sender address
        to: mEmail, // list of receivers
        subject: 'Hello ', // Subject line
        text: 'You are added in account group By expense manager user signup to join them and enjoy it..!!! ', // plain text body
        html: '<b>Welcome To Expense Manager</b>', // html body
      });
      return res.redirect('/transaction/id/' + id);
    } else {
      let transactions = await Transaction.find({ account: id });
      const memberData = await Account.find({ _id: id }, {});
      res.render('pages/transaction', {
        transaction: transactions,
        accountId: id,
        account: memberData,
        msg: 'already',
      });
    }
  } catch (err) {
    return res.status(400).json({
      msg: 'Something went wrong!',
    });
  }
}

/**
 * Delete a member from an account
 * @param {*} req
 * @param {*} res
 * @returns {Promise} Promise object representing the response
 */
async function deleteMember(req, res) {
  try {
    const { account, user } = res.locals;
    const id = req.params.id;
    const data = await Account.findOne({ 'members._id': id });
    let members = data.members;
    let check = false;
    for (let i = 0; i < members.length; i++) {
      if (members[i]._id == id) {
        if (members[i].isAdmin == false) {
          check = true;
          break;
        }
      }
    }
    const transactions = await Transaction.find({ account: data._id });
    const memberData = await Account.find({ _id: data._id }, {});
    if (check == true) {
      const update = await Account.findOneAndUpdate(
        { _id: data._id },
        { $pull: { members: { _id: id } } }
      );
      await update.save();
      res.redirect('/transaction/id/' + data._id);
      res.render('pages/transaction', {
        transaction: transactions,
        accountId: data._id,
        account: memberData,
        msg: 'deleted',
      });
    } else {
      const { account } = res.locals;
      res.render('pages/transaction', {
        accoundDetail: account,
        name: memberData.name,
        transaction: transactions,
        accountId: data._id,
        account: memberData,
        msg: 'default',
      });
    }
  } catch (err) {
    return res.status(400).json({
      msg: 'Something went wrong!',
    });
  }
}

/**
 * Delete an account
 * @param {*} req
 * @param {*} res
 * @returns {Promise} Promise object representing the response
 */
async function deleteAccount(req, res) {
  try {
    const { account, user } = res.locals;
    let data = await Account.findOne({ _id: req.params.id });
    let members = data.members;
    let check = false;
    if (data.isDefault == false) {
      for (let i = 0; i < members.length; i++) {
        if (members[i].email == user.email) {
          if (members[i].isAdmin == true) {
            check = true;
            // break;
          }
        }
      }
    } else {
      return res.render('pages/allAccount', {
        account: account,
        msg: 'default',
      });
    }
    if (check == true) {
      await Account.remove({ _id: data._id });
      await Transaction.deleteMany({ account: data._id });
      res.redirect('/account');
    } else {
      return res.render('pages/allAccount', {
        account: account,
        msg: 'noAdmin',
      });
    }
  } catch (err) {
    return res.status(400).json({
      msg: 'Something went wrong!',
    });
  }
}

module.exports = {
  getAllAccount,
  addAccount,
  updateAccountName,
  deleteAccount,
  getAddMember,
  addMember,
  deleteMember,
};

const { body, query, param } = require('express-validator/check');
const validator = require('validator');
const { Op } = require('sequelize');

const { customFindByPkValidation, validationEndFunction, BadRequestError, ApiError, NotFoundError } = require('../../middlewares/error-mid');
const CtrModelModule = require('../../models/gl_user');
const Model = CtrModelModule.model;
const utils = require('../../helpers/utils');

const controllerDefaultQueryScope = 'admin';

/**
 * List Validation
 */
exports.getIndexValidate = [
  query('page').optional().isInt(),
  query('q').optional().isString(),
  query('level').optional().isInt(),
  validationEndFunction,
];

/**
 * List Index
 */
exports.getIndex = async (req, res, next) => {
  try {
    const options = {
      where: {},
    };
    // q
    if (req.query.q) {
      const q = req.query.q;
      options.where[Op.or] = {
        name: {
          [Op.iLike]: `%${q}%`,
        },
        nickname: {
          [Op.iLike]: `%${q}%`,
        },
        email: {
          [Op.iLike]: `%${q}%`,
        }
      };
      if (validator.isNumeric(q, { no_symbols: true })) {
        options.where[Op.or].id = q;
      }
    }
    // level
    if (req.query.level) {
      options.where.level = req.query.level;
    }
    // query options
    const page = req.query.page || 1;
    Model.setLimitOffsetForPage(page, options);
    options.order - [
      ['name', 'asc'],
      ['email', 'asc'],
      ['id', 'asc'],
    ];
    // exec
    const queryResult = await Model
      .scope(controllerDefaultQueryScope)
      .findAndCountAll(options);
    const meta = Model.paginateMeta(queryResult, page);
    res.sendJsonOK({
      data: queryResult.rows, // TODO pensar em alguma camada de filtro de dados visiveis aqui
      meta: meta,
    });
  } catch (err) {
    next(err);
  }
}


/**
 * Get for Edit Validate
 */
exports.getEditValidate = [
  param('id')
    .isInt()
    .not().isEmpty()
    .custom(customFindByPkValidation(Model, controllerDefaultQueryScope)),
  validationEndFunction,
];

/**
 * Get for Edit
 */
exports.getEdit = async (req, res, next) => {
  try {
    const entity = req.entity;
    res.sendJsonOK({
      data: entity
    });
  } catch (err) {
    next(err);
  }
}



/**
 * Save validation
 */
const saveValidate = [
  param('id').optional().isInt(),
  body('name').isString().trim(),
  body('nickname').isString().trim(),
  body('level')
    .isIn(CtrModelModule.LEVEL_ALL)
    .custom((value, { req }) => {
      if ((value == CtrModelModule.LEVEL_ADMIN) && !req.user.levelIsAdmin) {
        throw new ApiError('Apenas usuários administradores podem adicionar outros administradores.');
      }
      return true;
    }),
  body('email').isEmail(),
  body('blocked')
    .isBoolean()
    .custom((value, { req }) => {
      if ((value && req.params.id == req.user.id)) {
        throw new ApiError('Você não pode bloquear a si mesmo.');
      }
      return true;
    }),
  // validationEndFunction, // aqui nao tem validate
];

const saveEntityFunc = async (req, res, next, id) => {
  try {
    const body = req.body;
    let entity = null;
    if (id) {
      entity = req.entity;
    } else {
      entity = Model.build({});
    }
    entity.name = body.name;
    entity.nickname = body.nickname;
    entity.email = body.email;
    entity.level = body.level;
    entity.level = body.level;
    entity.blocked = body.blocked;
    if (!id) {
      // generate random only if is create
      entity.password = utils.randomString(16);
      // TODO send invite e-mail
    }
    // save the user
    await entity.save();
    // send result
    const result = {
      entity: {
        id: entity.id
      }
    };
    // correct http
    if (id) {
      res.sendJsonOK(result);
    } else {
      res.sendJsonCreatedOK(result);
    }
  } catch (err) {
    next(err);
  }
}




/** Update validation */
exports.putUpdateValidate = [
  ...saveValidate,
  param('id')
    .isInt()
    .custom(customFindByPkValidation(Model, controllerDefaultQueryScope)),
  validationEndFunction,
];

/**
 * Update
 */
exports.putUpdate = async (req, res, next) => {
  try {
    await saveEntityFunc(req, res, next, req.params.id);
  } catch (err) {
    next(err);
  }
}




/**
 * Create validation
 */
exports.postCreateValidate = [
  ...saveValidate,
  validationEndFunction,
];

/**
 * Create
 */
exports.postCreate = async (req, res, next) => {
  try {
    await saveEntityFunc(req, res, next);
  } catch (err) {
    next(err);
  }
}




/**
 * Delete Validate
 */
exports.deleteValidate = [
  param('id')
    .isInt()
    .custom(customFindByPkValidation(Model, controllerDefaultQueryScope))
    .custom((value, { req }) => {
      if (value == req.user.id.toString()) {
        throw new ApiError("Você não pode excluir a si mesmo.");
      }
      return true;
    }),
  validationEndFunction,
];

/**
* Delete
*/
exports.delete = async (req, res, next) => {
  try {
    const id = req.params.id;
    const entity = req.entity;
    await entity.remove();
    res.sendJsonOK({
      data: entity,
    });
  } catch (err) {
    next(err);
  }
}




/** 
 * Test password Validate 
*/
exports.postPwdCheckValidate = [
  param('id')
    .isInt()
    .not().isEmpty()
    .custom(customFindByPkValidation(Model)), // no query scope
  body('pwd')
    .isString().trim()
    .not().isEmpty(),
  validationEndFunction,
];

/** Test password */
exports.postPwdCheck = async (req, res, next) => {
  try {
    const pwd = req.body.pwd;
    const entity = req.entity;
    if (!entity.password_compare(pwd)) {
      throw new ApiError('Senha errada!');
    }
    res.sendJsonOK();
  } catch (err) {
    next(err);
  }
};



/** Change password Validate */
exports.postPwdChangeValidate = [
  param('id')
    .isInt()
    .not().isEmpty()
    .custom((value, { req }) => {
      if (value == req.user.id.toString()) {
        throw new ApiError("Você não pode alterar sua própria senha desta forma.");
      }
      return true;
    })
    .custom(customFindByPkValidation(Model)), // no query scope
  body('pwd')
    .isString().trim()
    .not().isEmpty(),
  validationEndFunction,
];

/** Change password */
exports.postPwdChange = async (req, res, next) => {
  try {
    const id = req.params.id;
    const pwd = req.body.pwd;
    const entity = req.entity;
    entity.password_setPlain(pwd);
    await entity.save();
    res.sendJsonOK();
  } catch (err) {
    next(err);
  }
};


/** Invite or recover user password */
exports.postPwdRecoverValidate = [
  param('id')
    .isInt()
    .not().isEmpty()
    .custom(customFindByPkValidation(Model)), // no query scope
  body('isInvite')
    .isBoolean(),
  validationEndFunction,
];

/** Change password */
exports.postPwdRecover = async (req, res, next) => {
  try {
    const { isInvite } = req.body;
    const entity = req.entity;
    await entity.recover_generateAndSend(isInvite, req, res);
    res.sendJsonOK();
  } catch (err) {
    next(err);
  }
};
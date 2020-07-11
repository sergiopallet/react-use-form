import { useReducer, useEffect } from "react";

function isObject(variable) {
  return Object.prototype.toString.call(variable) === "[object Object]";
}

function setNestedObjectValues(
  object,
  value,
  visited = new WeakMap(),
  response = {}
) {
  for (let k of Object.keys(object)) {
    const val = object[k];
    if (isObject(val)) {
      if (!visited.get(val)) {
        visited.set(val, true);
        response[k] = Array.isArray(val) ? [] : {};
        setNestedObjectValues(val, value, visited, response[k]);
      }
    } else {
      response[k] = value;
    }
  }
  return response;
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_ERRORS":
      return {
        ...state,
        errors: action.payload,
      };
    case "SET_FIELD_VALUE":
      return {
        ...state,
        values: {
          ...state.values,
          ...action.payload,
        },
      };
    case "SET_VALUES":
      return {
        ...state,
        values: {
          ...action.payload,
        },
      };
    case "SET_FIELD_TOUCHED":
      return {
        ...state,
        touched: {
          ...state.touched,
          ...action.payload,
        },
      };
    case "SET_TOUCHED":
      return {
        ...state,
        touched: {
          touched: setNestedObjectValues(state.values, true),
        },
      };
    case "SUBMIT_ATTEMPT":
      return {
        ...state,
        isSubmiting: true,
        touched: setNestedObjectValues(state.values, true),
      };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        isSubmiting: false,
      };
    case "SUBMIT_FAILURE":
      return {
        ...state,
        isSubmiting: false,
        submitError: action.payload,
      };
    default:
      return state;
  }
}

export const useForm = (props) => {
  if (!props.onSubmit) {
    throw new Error("You forgot to pass onSubmit to useFormik");
  }

  const [state, dispatch] = useReducer(reducer, {
    values: props.initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    submitError: {},
  });

  const {validate}  = props;
  useEffect(() => {
    if (validate) {
      const errors = validate(state.values);
      dispatch({ type: "SET_ERRORS", payload: errors });
    }
  }, [state.values, validate ] );

  const handleChange = (event) => {
    event.persist();
    dispatch({
      type: "SET_FIELD_VALUE",
      payload: { [event.target.name]: event.target.value },
    });
  };

  const handleBlur = (event) => {
    event.persist();
    dispatch({
      type: "SET_FIELD_TOUCHED",
      payload: { [event.target.name]: true },
    });
  };

  const setValues = (values, shoundValidate = false) => {
    dispatch({
      type: "SET_VALUES",
      payload: values,
    });

    if (shoundValidate) {
      dispatch({
        type: "SET_TOUCHED",
      });
    }
  };

  const setFieldValue = (field, value, shoundValidate = false) => {
    dispatch({
      type: "SET_FIELD_VALUE",
      payload: { [field]: value },
    });

    if (shoundValidate) { 
      dispatch({
        type: "SET_FIELD_TOUCHED",
        payload: { [field]: true },
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    dispatch({ type: "SUBMIT_ATTEMPT" });
    const errors = props.validate(state.values);
    if (!Object.keys(errors).length) {
      try {
        await props.onSubmit(state.values);
        dispatch({ type: "SUBMIT_SUCCESS" });
      } catch (submitError) {
        dispatch({ type: "SUBMIT_FAILURE", payload: submitError });
      }
    } else {
      dispatch({ type: "SET_ERRORS", payload: errors });
      dispatch({ type: "SUBMIT_FAILURE" });
    }
  };

  return {
    handleChange,
    handleBlur,
    handleSubmit,
    setValues,
    setFieldValue,
    ...state,
  };
};

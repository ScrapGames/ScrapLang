/**
 * Lexer/Scanner prototype for ScrapLang
 * 
 * Lexer scan a file and reads his contents to get tokens that correspond to the tokens defined in the language syntax
 * For example, const, fn, enum... are keywords and Lexer identifies as such
 * 
 * If Lexer founds a keyword or another token that is invalid, will throw an error
 */

import { isAlpha, isNumeric, isAlphaNum, isSpace, isHexadecimal, inArray } from "../utils.ts"

import LexingError from "./lexer-error.ts"
import LexerCursor from "./lexer-cursor.ts"

export type TokenType = |
  "IdentifierName"      |
  "Statement"           |
  "NumericLiteral"      |
  "FloatLiteral"        |
  "BinaryLiteral"       |
  "OctalLiteral"        |
  "HexaLiteral"         |
  "CharLiteral"         |
  "StringLiteral"       |
  "TemplateString"      |
  "Keyword"             |
  "Operator"            |
  "Token"               |
  "Unknown"

export enum Tokens {
  LPAREN        = '(',
  RPAREN        = ')',
  LBRACE        = '{',
  RBRACE        = '}',
  LSQRBR        = '[',
  RSQRBR        = ']',
  COMMA         = ',',
  DQUOTE        = '"',
  QUOTE         = '\'',
  BACKSTICK     = '`',
  PLUS          = '+',
  MINUS         = '-',
  STAR          = '*',
  SLASH         = '/',
  PERCEN        = '%',
  LESS          = '<',
  GREATER       = '>',
  DOT           = '.',
  AMPER         = '&',
  EQUAL         = '=',
  ESP           = '~',
  COLON         = ':',
  SEMICOLON     = ';',
  EXCLAMATION   = '!',
  INTERROGATION = '?',
  UNDERSCORE    = '_',

  // Spacials Tokens (e.g: module accessor)
  MODULE_ACCESSOR = "::"
}

export enum Keywords {
  FN          = "fn",
  VAR         = "var",
  CONST       = "const",
  RETURN      = "return",
  IMPORT      = "import",
  FROM        = "from",
  EXPORT      = "export",
  CLASS       = "class",
  THIS        = "this",
  SUPER       = "super",
  TYPE        = "type",
  INTERFACE   = "interface",
  ENUM        = "enum",
  EXTENDS     = "extends",
  IMPLEMENTS  = "implements",
  MODULE      = "module",
  FOR         = "for",
  WHILE       = "while",
  DO          = "do",
  BREAK       = "break",
  SKIP        = "skip",
  IF          = "if",
  ELSE        = "else",
  ELIF        = "elif",
  SWITCH      = "switch",
  CASE        = "case",
  DEFAULT     = "default",
  IN          = "in",
  OF          = "of",
  AND         = "and",
  OR          = "or",
  NOT         = "not",
  TRY         = "try",
  CATCH       = "catch",
  AS          = "as",
  CONSTRUCTOR = "constructor",
  DESTRUCTOR  = "destructor",
  NEW         = "new",
  DROP        = "drop",
  PUBLIC      = "public",
  PRIVATE     = "private",
  PROTECTED   = "protected",
  STATIC      = "static",
  OVERRIDE    = "override",
  SETTER      = "setter",
  GETTER      = "getter",
  ASYNC       = "async",
  AWAIT       = "await"
}

export interface Token {
  type: TokenType,
  content: string,
  pos: number,
  line: number
}

const VALID_HEXADECIMAL_END = [
  'A', 'B', 'C', 'D', 'E', 'F'
]

export default class Lexer {
  cursor: LexerCursor
  fileName: string
  line: number

  public constructor(source: string, fileName: string) {
    this.cursor = new LexerCursor(source)
    this.fileName = fileName
    this.line = 0
  }

  /**
   * Sets the a lexer object ready to read a new file and tokenize his content
   * @param otherFileName Name of the new file to be scanned
   * @param otherSource 
   */
  public alsoScan(otherFileName: string, otherSource: string) {
    // Configure the lexer
    this.line = 0
    this.fileName = otherFileName

    // configure the cursor
    this.cursor.source = otherSource
    this.cursor.currentTok = otherSource.at(0)!
    this.cursor.pos = 0
  }

  /**
   * Returns the next char, advancing the cursor 1 position
   * @returns the next char in the input
   */
  private consume() { return this.cursor.consume() }

  private nextToken() { return this.cursor.currentTok = this.cursor.consume() }

  /**
   * Aux method to check the next token
   * @param char Possible next char
   * @returns 
   */
  private checkNext(char: string): boolean {
    return this.cursor.next() === char
  }

  private resolveIdentifier(identifier: string): Token {
    switch (identifier) {
      case Keywords.FN:
      case Keywords.VAR:
      case Keywords.CONST:
      case Keywords.RETURN:
      case Keywords.IMPORT:
      case Keywords.FROM:
      case Keywords.EXPORT:
      case Keywords.CLASS:
      case Keywords.TYPE:
      case Keywords.INTERFACE:
      case Keywords.ENUM:
      case Keywords.EXTENDS:
      case Keywords.IMPLEMENTS:
      case Keywords.MODULE:
      case Keywords.FOR:
      case Keywords.WHILE:
      case Keywords.DO:
      case Keywords.BREAK:
      case Keywords.SKIP: // same as continue in other languages
      case Keywords.IF:
      case Keywords.ELSE:
      case Keywords.ELIF:
      case Keywords.SWITCH:
      case Keywords.CASE:
      case Keywords.DEFAULT:
      case Keywords.IN:
      case Keywords.OF:
      case Keywords.AND:
      case Keywords.OR:
      case Keywords.NOT:
      case Keywords.TRY:
      case Keywords.CATCH:
      case Keywords.AS:
      case Keywords.NEW:
      case Keywords.DROP:
      case Keywords.PUBLIC:
      case Keywords.PRIVATE:
      case Keywords.PROTECTED:
      case Keywords.STATIC:
      case Keywords.OVERRIDE:
      case Keywords.SETTER:
      case Keywords.GETTER:
      case Keywords.ASYNC:
      case Keywords.AWAIT: {
        return { type: "Statement", content: identifier, line: this.line, pos: this.cursor.pos }
      }

      case "instanceof": {
        return { type: "Operator", content: identifier, line: this.line, pos: this.cursor.pos }
      }

      default: {
        return { type: "IdentifierName", content: identifier, line: this.line, pos: this.cursor.pos }
      }
    }
  }

  private scanBinary() {
    let binaryNum = ""
    let nextTok = this.cursor.currentTok
    do {
      this.checkNumericSeparators()

      if (/[0-1]/.test(nextTok))
        binaryNum += nextTok
      else
        throw new LexingError(this, "Invalid binary literal. Binary literals may only contains 0 and 1 digits")

      nextTok = this.nextToken()

    } while (!this.cursor.isEOF() && isNumeric(nextTok))

    return binaryNum
  }

  private scanOctal() {
    let octalNum = ""
    let nextTok = this.cursor.currentTok

    do {
      this.checkNumericSeparators()

      if (/[0-7]/.test(nextTok))
        octalNum += nextTok
      else
        throw new LexingError(this, "Invalid octal literal. Octal literals may only contains digits from 0 to 7")

      nextTok = this.nextToken()
    } while (!this.cursor.isEOF() && isNumeric(nextTok))
    
    return octalNum
  }

  private scanHexadecimal() {
    let hexaNum = ""
    let nextTok = this.cursor.currentTok

    do {
      this.checkNumericSeparators()

      if (isHexadecimal(nextTok))
        hexaNum += nextTok
      else
        throw new LexingError(this, "Invalid hexadecimal literal. Exadecimal literals may only contains: numeric range from 0 to 9 and letter ranger from 'A' to 'F'")

      nextTok = this.nextToken()
    } while (!this.cursor.isEOF() && isHexadecimal(nextTok))

    return hexaNum
  }

  private checkNumericSeparators() {
    const numRange = /[0-9]/
    if (this.cursor.currentTok === Tokens.UNDERSCORE) {
      if (this.checkNext(Tokens.UNDERSCORE))
        throw new LexingError(this, "Multiple consecutive numeric separators are not permitted")

      if (!numRange.test(this.cursor.previous()) || !numRange.test(this.cursor.next()))
        throw new LexingError(this, "Numeric separators are now allowed here")

      this.nextToken()
    }
  }

  public tokens(): Token[] {
    const tokens: Token[] = []
    let identifier = ""
    let numericIdentifier = ""
  
    while (!this.cursor.isEOF()) {
      this.nextToken()
  
      while (isSpace(this.cursor.currentTok))
        this.nextToken()
  
      if (this.cursor.currentTok === '\n') {
        this.line++
      }
  
      // Validation only with alphabetic characters
      // occurs because a variable or another recognizer, token, identifier, etc
      // can not start with a number, because a comparation between if a token is a number or an identifier will overlap
      // for example, var 1test = "test" is incorrect
      // the correct way to declare this variable would be: var test1 = "test"
      if (isAlpha(this.cursor.currentTok)) {
        identifier = ""
  
        // since other recognizers, tokens, identifiers, etc as of the first character
        // can contains numbers, we accept numbers after the first character too
        // example: var t12345 = 10
  
        do {
          identifier += this.cursor.currentTok
        } while (!this.cursor.isEOF() && isAlphaNum(this.nextToken()))
  
        tokens.push(this.resolveIdentifier(identifier))
      }
  
      if (isNumeric(this.cursor.currentTok)) {
        numericIdentifier = ""
        let isFloat = false, isHexadecimal = false, isOctal = false, isBinary = false
  
        do {
          this.checkNumericSeparators()

          // If reachs a dot, means it is a float, but a dot can not appears in wherever
          if (this.cursor.currentTok === Tokens.DOT) {
            if (isFloat) // if the current lexed number, was already marked as a float
              throw new LexingError(this, `Invalid float literal. Only a dot is permitted to separate the tens from the decimals`)

            if (isBinary || isOctal || isHexadecimal)
              throw new LexingError(this, `Numeric literal can not be a float value since the number was leading with an ${numericIdentifier.substring(0, 2)}.
            It is considered an integer, not a float`)

            isFloat = true
          }

          // At the start, if the number starts with 0, means that a literal will be preceed the 0
          // Example: if you want write a octal literal integer, then you must writes: 0o44. Then ScrapLang will convert the value to an integer with decimal base (10)
          if (this.cursor.currentTok === '0' && numericIdentifier.length === 0) {
            numericIdentifier += this.cursor.currentTok
            switch (this.cursor.next()) {
              case 'b': case 'B': isBinary = true; break
              case 'o': case 'O': isOctal = true; break
              case 'x': case 'X': isHexadecimal = true; break

              default: throw new LexingError(
                this,
            `Invalid literal, place 'b', 'o' or 'x' after the 0.
            Learn more at: https://lang.scrapgames.com/tutorial/numeric_literals`
              )
            }

            this.nextToken()            
          }
          switch (numericIdentifier.substring(0, 2)) {
            // If the number is a literal integer with base not 10 (binary, octal or hexadecimal)
            case "0b": case "0B": numericIdentifier = this.scanBinary(); break
            case "0o": case "0O": numericIdentifier = this.scanOctal(); break
            case "0x": case "0X": numericIdentifier = this.scanHexadecimal(); break

            // else, then the parsed number its a number with base 10 or a float (floast is base 10 too)
            default: numericIdentifier += this.cursor.currentTok
          }
        } while (!this.cursor.isEOF() && isNumeric(this.nextToken()))

        // after the while, lets make another tests
        const lastNumericIdChar = numericIdentifier.charAt(numericIdentifier.length - 1)
        if (isHexadecimal) {
          if (!isNumeric(lastNumericIdChar) && !inArray(lastNumericIdChar.toUpperCase(), VALID_HEXADECIMAL_END))
            throw new LexingError(this, `Wrong hexadecimal character, only allowed: 0-9, ${VALID_HEXADECIMAL_END.join(", ")}. (too valid as lowercase characters)`)
        }

        if (!isNumeric(lastNumericIdChar) && !isHexadecimal)
          throw new LexingError(this, "A number must ends with numeric character")

        if (isBinary)
          tokens.push({ type: "BinaryLiteral", content: numericIdentifier, line: this.line, pos: this.cursor.pos })
        else if (isOctal)
          tokens.push({ type: "OctalLiteral", content: numericIdentifier, line: this.line, pos: this.cursor.pos })
        else if (isHexadecimal)
          tokens.push({ type: "HexaLiteral", content: numericIdentifier, line: this.line, pos: this.cursor.pos })
        else if (isFloat)
          tokens.push({ type: "FloatLiteral", content: numericIdentifier, line: this.line, pos: this.cursor.pos })
        else
          tokens.push({ type: "NumericLiteral", content: numericIdentifier, line: this.line, pos: this.cursor.pos })
      }
  
      /**
       * Finally, if `currentTok` doesnt match with any 'if' statement
       * We match what means every single token, like '+', '-', '*'
       */
      switch (this.cursor.currentTok) {
        case Tokens.LBRACE:
        case Tokens.RBRACE:
        case Tokens.LPAREN:
        case Tokens.RPAREN:
        case Tokens.LSQRBR:
        case Tokens.RSQRBR:
        case Tokens.COMMA:
        case Tokens.AMPER:
        case Tokens.EQUAL:
        case Tokens.ESP:
        case Tokens.SEMICOLON:
        case Tokens.EXCLAMATION:
        case Tokens.INTERROGATION: {
          tokens.push({ type: "Token", content: this.cursor.currentTok, line: this.line, pos: this.cursor.pos })
        } break
  
        case Tokens.GREATER:
        case Tokens.LESS:
        case Tokens.PLUS: // Minus char is checked below instead after Tokens.PLUS
        case Tokens.STAR: {
          tokens.push({ type: "Operator", content: this.cursor.currentTok, line: this.line, pos: this.cursor.pos })
        } break
  
        
        case Tokens.SLASH: {
          if (this.checkNext(Tokens.SLASH)) {
            do {
              this.cursor.currentTok = this.consume() // manual assingment instead use `nextToken` to avoid overlaped comparations
            } while (this.cursor.currentTok !== '\n' && !this.cursor.isEOF())
          } else if (this.checkNext(Tokens.STAR)) {
            for (;;) {
              if (this.cursor.currentTok === Tokens.STAR) {
                this.cursor.currentTok = this.consume() // manual assignment instead use `nextToken` to avoid overlaped comparations
                if (this.cursor.currentTok === Tokens.SLASH)
                  break
              } else this.nextToken()
            }
  
            if (this.cursor.isEOF())
              continue // avoid infinite looping
            else this.nextToken()
          } else {
            tokens.push({ type: "Operator", content: this.cursor.currentTok, line: this.line, pos: this.cursor.pos })
          }
        } break
  
        /**
         * Minus character (-) is checked below all other operators because it can be followed by a greater character ('>')
         * This means that is a lambda function
         */
        case Tokens.MINUS: {
          if (this.checkNext(Tokens.GREATER)) {
            this.nextToken()
            tokens.push({ type: "Token", content: "->", line: this.line, pos: this.cursor.pos })
          } else
            tokens.push({ type: "Operator", content: this.cursor.currentTok, line: this.line, pos: this.cursor.pos })
        } break
  
        case Tokens.QUOTE: {
          identifier = this.nextToken()
          
          while (this.nextToken() !== Tokens.QUOTE)
            identifier += this.cursor.currentTok
  
          tokens.push({ type: "CharLiteral", content: identifier, line: this.line, pos: this.cursor.pos })
        } break
  
        case Tokens.BACKSTICK: {
          identifier = this.nextToken()
  
          while (this.nextToken() !== Tokens.BACKSTICK)
            identifier += this.cursor.currentTok
          
          tokens.push({ type: "StringLiteral", content: identifier, line: this.line, pos: this.cursor.pos })
        } break
  
        case Tokens.DQUOTE: {
          identifier = this.nextToken()
  
          while (this.nextToken() !== Tokens.DQUOTE)
            identifier += this.cursor.currentTok
  
          
          tokens.push({ type: "StringLiteral", content: identifier, line: this.line, pos: this.cursor.pos })
  
        } break
  
        case Tokens.COLON: {
          if (this.checkNext(":")) {
            this.nextToken()
            tokens.push({ type: "Operator", content: "::", line: this.line, pos: this.cursor.pos })
          } else
            tokens.push({ type: "Token", content: this.cursor.currentTok, line: this.line, pos: this.cursor.pos })
        } break
  
        case Tokens.DOT: {
          if (this.checkNext('.')) {
            this.nextToken()
            if (this.checkNext('.')) {
              this.nextToken()
              tokens.push({ type: "Token", content: "...", line: this.line, pos: this.cursor.pos })
            } else
              tokens.push({ type: "Token", content: "..", line: this.line, pos: this.cursor.pos }) // support for slices
          } else
            tokens.push({ type: "Token", content: this.cursor.currentTok, line: this.line, pos: this.cursor.pos })
        } break
      }
    }
  
    return tokens
  }
}

//! Unused at the moment, `tokens` function may be replaced by a recursive function in future implementations
// public tokens(): Token {
  //   let identifier = ""
  //   let numericIdentifier = ""

  //   while (isSpace(this.cursor.currentTok))
  //     this.nextToken()

  //   if (this.cursor.currentTok === '\n')
  //     this.line++

  //   // Validation only with alphabetic characters
  //   // occurs because a variable or another recognizer, token, identifier, etc
  //   // can not start with a number, because a comparation between if a token is a number or an identifier will overlap
  //   // for example, var 1test = "test" is incorrect
  //   // the correct way to declare this variable would be: var test1 = "test"
  //   if (isAlpha(this.cursor.currentTok)) {
  //     identifier = ""

  //     // since other recognizers, tokens, identifiers, etc as of the first character
  //     // can contains numbers, we accept numbers after the first character too
  //     // example: var t12345 = 10

  //     do {
  //       identifier += this.cursor.currentTok
  //     } while (!this.cursor.isEOF() && isAlphaNum(this.nextToken()))

  //     return this.resolveIdentifier(identifier)
  //   }

  //   if (isNumeric(this.cursor.currentTok)) {
  //     numericIdentifier = ""
  //     let isFloat = false

  //     do {
  //       if (this.cursor.currentTok === Tokens.UNDERSCORE) {
  //         if (this.checkNext(Tokens.UNDERSCORE))
  //           throw new LexingError(this, "Multiple consecutive numeric separators are not permitted")
  //         this.nextToken()
  //       }
  //       if (this.cursor.currentTok === Tokens.DOT)
  //         isFloat = true
  //       numericIdentifier += this.cursor.currentTok
  //     } while (!this.cursor.isEOF() && (isNumeric(this.nextToken()) || this.cursor.currentTok === Tokens.DOT || this.cursor.currentTok === Tokens.UNDERSCORE))

  //     if (!isNumeric(numericIdentifier.charAt(numericIdentifier.length - 1)))
  //       throw new LexingError(this, "A number must ends with numeric character")

  //     if (isFloat)
  //       return { type: "FloatLiteral", content: numericIdentifier }
  //     else
  //       return { type: "NumericLiteral", content: numericIdentifier }
  //   }

  //   /**
  //    * Finally, if `currentTok` doesnt match with any 'if' statement
  //    * We match what means every single token, like '+', '-', '*'
  //    */
  //   switch (this.cursor.currentTok) {
  //     case Tokens.LBRACE:
  //     case Tokens.RBRACE:
  //     case Tokens.LPAREN:
  //     case Tokens.RPAREN:
  //     case Tokens.LSQRBR:
  //     case Tokens.RSQRBR:
  //     case Tokens.COMMA:
  //     case Tokens.AMPER:
  //     case Tokens.EQUAL:
  //     case Tokens.ESP:
  //     case Tokens.SEMICOLON:
  //     case Tokens.EXCLAMATION:
  //     case Tokens.INTERROGATION: {
  //       return { type: "Token", content: this.cursor.currentTok }
  //     }

  //     case Tokens.GREATER:
  //     case Tokens.LESS:
  //     case Tokens.PLUS: // Minus char is checked below instead after Tokens.PLUS
  //     case Tokens.STAR: {
  //       return { type: "Operator", content: this.cursor.currentTok }
  //     }

      
  //     case Tokens.SLASH: {
  //       if (this.checkNext('/')) {
  //         do {
  //           this.cursor.currentTok = this.consume() // manual assingment instead use `nextToken` to avoid overlaped comparations
  //         } while (this.cursor.currentTok !== '\n' && !this.cursor.isEOF())
  //       } else if (this.checkNext('*')) {

  //         /* for (;;) {
  //           if (this.cursor.currentTok === '*') {
  //             this.cursor.currentTok = this.consume() // manual assignment instead use `nextToken` to avoid overlaped comparations
  //             if (this.cursor.currentTok === '/')
  //               break
  //           } else this.nextToken()
  //         }

  //         if (this.cursor.isEOF())
  //           continue // avoid infinite looping
  //         else this.nextToken() */
  //       } else {
  //         return { type: "Operator", content: this.cursor.currentTok }
  //       }
  //     } break

  //     /**
  //      * Minus character (-) is checked below all other operators because it can be followed by a greater character ('>')
  //      * This means that is a lambda function
  //      */
  //     case Tokens.MINUS: {
  //       if (this.checkNext(">")) {
  //         this.nextToken()
  //         return { type: "Token", content: "->" }
  //       } else
  //         return { type: "Operator", content: this.cursor.currentTok }
  //     }

  //     case Tokens.QUOTE: {
  //       identifier = this.nextToken()
        
  //       while (this.nextToken() !== Tokens.QUOTE)
  //         identifier += this.cursor.currentTok

  //       return { type: "CharLiteral", content: identifier }
  //     }

  //     case Tokens.BACKSTICK: {
  //       identifier = this.nextToken()

  //       while (this.nextToken() !== Tokens.BACKSTICK)
  //         identifier += this.cursor.currentTok
        
  //       return { type: "StringLiteral", content: identifier }
  //     }

  //     case Tokens.DQUOTE: {
  //       identifier = this.nextToken()

  //       while (this.nextToken() !== Tokens.DQUOTE)
  //         identifier += this.cursor.currentTok

        
  //       return { type: "StringLiteral", content: identifier }

  //     }

  //     case Tokens.COLON: {
  //       if (this.checkNext(":")) {
  //         this.nextToken()
  //         return { type: "Operator", content: "::" }
  //       } else
  //         return { type: "Token", content: this.cursor.currentTok }
  //     }

  //     case Tokens.DOT: {
  //       if (this.checkNext('.')) {
  //         this.nextToken()
  //         if (this.checkNext('.')) {
  //           this.nextToken()
  //           return { type: "Token", content: "..." }
  //         } else
  //           return { type: "Token", content: ".."} // support for slices
  //       } else
  //         return { type: "Token", content: this.cursor.currentTok }
  //     }
  //   }

  //   if (!this.cursor.isEOF())
  //     return this.tokens()

  //   return { type: "Unknown", content: this.cursor.currentTok }
  // }